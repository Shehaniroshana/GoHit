import { EndpointInfo, ParseResult } from './types';

export class GoParser {
    parse(content: string, fileName: string): ParseResult {
        const endpoints: EndpointInfo[] = [];

        // PRIORITY 1: Parse @gohit annotations (user-defined)
        const annotationEndpoints = this.parseAnnotations(content);
        endpoints.push(...annotationEndpoints);

        // PRIORITY 2: Auto-detect from routing code (fallback)
        const autoDetectedEndpoints = this.parseRoutingCode(content);
        endpoints.push(...autoDetectedEndpoints);

        return {
            endpoints,
            hasHandlers: endpoints.length > 0
        };
    }

    /**
     * Parse @gohit annotations
     * Format: // @gohit METHOD PATH [StructName]
     * Example: // @gohit POST /api/users CreateUserRequest
     */
    private parseAnnotations(content: string): EndpointInfo[] {
        const endpoints: EndpointInfo[] = [];
        const lines = content.split('\n');

        const annotationRegex = /\/\/\s*@gohit\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS)\s+(\S+)(?:\s+(\S+))?/i;

        lines.forEach((line, index) => {
            const match = line.match(annotationRegex);
            if (match) {
                const method = match[1].toUpperCase();
                let path = match[2];
                const structName = match[3]; // Optional

                // Clean path
                path = path.replace(/\/+/g, '/');
                if (path !== '/' && path.endsWith('/')) {
                    path = path.slice(0, -1);
                }
                if (!path.startsWith('/')) {
                    path = '/' + path;
                }

                endpoints.push({
                    method,
                    path,
                    framework: 'annotation',
                    line: index + 1,
                    handler: structName || ''
                });
            }
        });

        return endpoints;
    }

    /**
     * Auto-detect endpoints from routing code (original logic)
     */
    private parseRoutingCode(content: string): EndpointInfo[] {
        const endpoints: EndpointInfo[] = [];

        const hasGin = /gin\.(?:Engine|Default|New|Group)/.test(content) || /"github\.com\/gin-gonic\/gin"/.test(content);
        const hasFiber = /fiber\.(?:App|New|Group)/.test(content) || /"github\.com\/gofiber\/fiber/.test(content);
        const hasEcho = /echo\.(?:Echo|New|Group)/.test(content) || /"github\.com\/labstack\/echo/.test(content);
        const hasChi = /chi\.(?:NewRouter|Router|Mux)/.test(content) || /"github\.com\/go-chi\/chi/.test(content);
        const hasMux = /mux\.(?:NewRouter|Router)/.test(content) || /"github\.com\/gorilla\/mux/.test(content);
        const hasNetHttp = /http\.HandleFunc|http\.Handle\(/.test(content) || /"net\/http"/.test(content);

        // Chi requires a RECURSIVE scope-aware parser because it reuses variable names
        // across sibling closures (the flat map approach gets corrupted)
        if (hasChi) {
            const chiEndpoints = this.parseChiRecursive(content);
            endpoints.push(...chiEndpoints);
        }

        // For non-Chi frameworks, use the normalizer-based flat approach
        if (!hasChi || hasGin || hasFiber || hasEcho || hasMux || hasNetHttp) {
            const normalizationResult = this.normalizeMultiLineStatements(content);
            const lines = normalizationResult.content.split('\n');
            const lineMapping = normalizationResult.mapping;

            const routeGroups: Record<string, string> = {
                'r': '', 'app': '', 'e': '', 'router': '', 'v1': '', 'api': ''
            };

            lines.forEach((line, index) => {
                const lineNumber = lineMapping[index] || index + 1;
                this.scanLine(line, lineNumber, routeGroups, endpoints, { hasGin, hasFiber, hasEcho, hasChi: false, hasMux, hasNetHttp });
            });
        }

        return endpoints;
    }

    /**
     * Recursively parse Chi routing blocks with proper scope-awareness.
     * This is necessary because Chi reuses variable names (r) across sibling closures,
     * which causes the flat-map approach to produce wrong paths.
     */
    private parseChiRecursive(content: string): EndpointInfo[] {
        const endpoints: EndpointInfo[] = [];
        this.processChiBlock(content, 0, content.length, '', endpoints, content);
        return endpoints;
    }

    private processChiBlock(content: string, blockStart: number, blockEnd: number, prefix: string, endpoints: EndpointInfo[], fullContent: string): void {
        const block = content.substring(blockStart, blockEnd);

        // Ranges in `block` that have already been recursively processed
        const processedRanges: Array<[number, number]> = [];

        // Helper: is a position inside an already-processed range?
        const isProcessed = (pos: number) => processedRanges.some(([s, e]) => pos >= s && pos <= e);

        // ── Pass 1: Route/Mount blocks (add path prefix, recurse) ────────────────
        const routeBlockRegex = /(\w+)\.(?:Route|Mount)\s*\(\s*["']([^"']+)["']\s*,\s*func\s*\(\s*(\w+)[^)]*\)\s*\{/g;
        let match: RegExpExecArray | null;

        routeBlockRegex.lastIndex = 0;
        while ((match = routeBlockRegex.exec(block)) !== null) {
            if (isProcessed(match.index)) continue;          // already inside a deeper block

            const routePrefix = match[2];
            const funcBodyStart = match.index + match[0].length;
            const innerBlockEnd = this.findMatchingBrace(block, funcBodyStart - 1);
            if (innerBlockEnd === -1) continue;

            // Mark the entire Route("...", func(...){ ... }) span as processed
            processedRanges.push([match.index, innerBlockEnd + 2]); // +2 covers })

            const newPrefix = this.joinPaths(prefix, routePrefix);
            this.processChiBlock(content, blockStart + funcBodyStart, blockStart + innerBlockEnd, newPrefix, endpoints, fullContent);
        }

        // ── Pass 2: Group blocks (same prefix, recurse) ──────────────────────────
        const groupBlockRegex = /(\w+)\.Group\s*\(\s*func\s*\(\s*(\w+)[^)]*\)\s*\{/g;
        groupBlockRegex.lastIndex = 0;
        while ((match = groupBlockRegex.exec(block)) !== null) {
            if (isProcessed(match.index)) continue;

            const funcBodyStart = match.index + match[0].length;
            const innerBlockEnd = this.findMatchingBrace(block, funcBodyStart - 1);
            if (innerBlockEnd === -1) continue;

            processedRanges.push([match.index, innerBlockEnd + 2]);
            this.processChiBlock(content, blockStart + funcBodyStart, blockStart + innerBlockEnd, prefix, endpoints, fullContent);
        }

        // ── Pass 3: Flat HTTP method calls (only at this scope level) ────────────
        const methodRegex = /(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head|HandleFunc|Handle)\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)/g;
        methodRegex.lastIndex = 0;
        while ((match = methodRegex.exec(block)) !== null) {
            if (isProcessed(match.index)) continue;         // inside a Route/Group block

            const httpMethod = match[2].toUpperCase();
            const routePath = match[3];
            const fullPath = this.joinPaths(prefix, routePath);

            const absOffset = blockStart + match.index;
            const lineNumber = (content.substring(0, absOffset).match(/\n/g) || []).length + 1;

            endpoints.push({
                method: httpMethod,
                path: fullPath,
                framework: 'chi',
                line: lineNumber,
                handler: (match[4] ?? 'anonymous').split(',')[0].trim()
            });
        }
    }

    /**
     * Find the index of the closing brace that matches the opening brace at `openIdx`.
     * `openIdx` should point to the `{` character in `str`.
     */
    private findMatchingBrace(str: string, openIdx: number): number {
        // Scan forward from openIdx to find the `{`
        let start = openIdx;
        while (start < str.length && str[start] !== '{') start++;
        if (start >= str.length) return -1;

        let depth = 0;
        for (let i = start; i < str.length; i++) {
            if (str[i] === '{') depth++;
            else if (str[i] === '}') {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    /**
     * Join two path segments, normalizing double slashes and trailing slashes.
     */
    private joinPaths(base: string, segment: string): string {
        const joined = (base + '/' + segment).replace(/\/+/g, '/');
        return joined !== '/' && joined.endsWith('/') ? joined.slice(0, -1) : joined;
    }

    private scanLine(line: string, lineNumber: number, routeGroups: Record<string, string>, endpoints: EndpointInfo[], hints: any) {
        // 1. Detect Group definitions (assignments)
        // e.g., v1 := r.Group("/v1")
        const groupAssignments = line.matchAll(/(\w+)\s*(?::?=|:=)\s*(\w+)\.(?:Group|Route|Mount)\s*\(\s*["']([^"']*)["']/g);
        for (const match of groupAssignments) {
            const newVar = match[1];
            const parentVar = match[2];
            const newPath = match[3];
            this.registerGroup(newVar, parentVar, newPath, routeGroups);
        }

        // 2. Detect Chi-style Route/Mount with inline function
        // e.g., r.Route("/api", func(r chi.Router) { ... }) or r.Mount("/api", func(sub chi.Router) { ... })
        const chiRoutes = line.matchAll(/(\w+)\.(?:Route|Mount)\s*\(\s*["']([^"']*)["']\s*,\s*(?:func\s*\(\s*(\w+)|(\w+))/g);
        for (const match of chiRoutes) {
            const parentVar = match[1];
            const newPath = match[2];
            const newVar = match[3] || match[4]; // Handle both inline func and named handler
            if (newVar && newVar !== 'func') {
                this.registerGroup(newVar, parentVar, newPath, routeGroups);
            }
        }

        // 2.5 Detect Chi-style Group with inline function
        // e.g., r.Group(func(r chi.Router) { ... })
        const chiGroups = line.matchAll(/(\w+)\.Group\s*\(\s*func\s*\(\s*(\w+)/g);
        for (const match of chiGroups) {
            const parentVar = match[1];
            const newVar = match[2];
            this.registerGroup(newVar, parentVar, "", routeGroups);
        }

        // 3. Detect Endpoints
        if (hints.hasNetHttp) {
            const httpMatches = line.matchAll(/http\.(?:HandleFunc|Handle)\s*\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_\.\(\)]+)/g);
            for (const match of httpMatches) {
                let path = match[1];
                let method = 'GET/POST';

                // Support Go 1.22+ "METHOD PATH" syntax
                if (path.includes(' ')) {
                    const parts = path.split(' ');
                    if (parts.length === 2) {
                        method = parts[0].toUpperCase();
                        path = parts[1];
                    }
                }

                endpoints.push({
                    method: method,
                    path: path,
                    framework: 'net/http',
                    line: lineNumber,
                    handler: match[2]
                });
            }
        }

        const extractHandlers = (handlerString: string): string => {
            const parts: string[] = [];
            let current = '';
            let parenDepth = 0;
            let braceDepth = 0;

            for (let i = 0; i < handlerString.length; i++) {
                const char = handlerString[i];
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
                else if (char === '{') braceDepth++;
                else if (char === '}') braceDepth--;

                if (char === ',' && parenDepth === 0 && braceDepth === 0) {
                    parts.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            if (current) parts.push(current);

            const handlers = parts
                .map(h => h.trim())
                .map(h => {
                    if (h.startsWith('func')) return h;
                    const match = h.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)/);
                    return match ? match[1] : '';
                })
                .filter(h => h.length > 0 && !h.startsWith('middleware.'));

            return handlers.length > 0 ? handlers.join('|') : 'anonymous';
        };

        const addEndpoint = (framework: 'gin' | 'fiber' | 'echo' | 'chi' | 'mux', method: string, path: string, routerVar: string, handler: string) => {
            const prefix = routeGroups[routerVar] || '';
            let fullPath = (prefix + '/' + path).replace(/\/+/g, '/');
            if (fullPath !== '/' && fullPath.endsWith('/')) {
                fullPath = fullPath.slice(0, -1);
            }

            let finalMethod = method;
            const lowPath = fullPath.toLowerCase();
            const lowHandler = handler.toLowerCase();
            if (method === 'GET' && (
                lowPath.endsWith('/ws') || lowPath.includes('/websocket') || lowPath.includes('/socket') ||
                lowHandler.includes('ws') || lowHandler.includes('websocket') || lowHandler.includes('socket')
            )) {
                finalMethod = 'WS';
            }

            endpoints.push({
                method: finalMethod,
                path: fullPath || '/',
                framework,
                line: lineNumber,
                handler
            });
        };

        if (hints.hasGin) {
            const matches = line.matchAll(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS|Any|Handle)\s*\(\s*["']([^"']*)["']\s*,\s*([^)]+)/g);
            for (const match of matches) {
                const handlerChain = extractHandlers(match[4]);
                addEndpoint('gin', match[2].toUpperCase(), match[3], match[1], handlerChain);
            }
        }

        if (hints.hasFiber) {
            const matches = line.matchAll(/(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head|All|Add|Any)\s*\(\s*["']([^"']*)["']\s*,\s*([^)]+)/g);
            for (const match of matches) {
                const handlerChain = extractHandlers(match[4]);
                addEndpoint('fiber', match[2].toUpperCase(), match[3], match[1], handlerChain);
            }
        }

        if (hints.hasEcho) {
            const matches = line.matchAll(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|Any|File|Static)\s*\(\s*["']([^"']*)["']\s*,\s*([^)]+)/g);
            for (const match of matches) {
                const handlerChain = extractHandlers(match[4]);
                addEndpoint('echo', match[2].toUpperCase(), match[3], match[1], handlerChain);
            }
        }

        if (hints.hasChi) {
            const matches = line.matchAll(/(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head|Any|Handle|HandleFunc|Method|MethodFunc)\s*\(\s*["']([^"']*)["']\s*,\s*([^)]+)/g);
            for (const match of matches) {
                const handlerChain = extractHandlers(match[4]);
                addEndpoint('chi', match[2].toUpperCase(), match[3], match[1], handlerChain);
            }
        }

        if (hints.hasMux) {
            const matches = line.matchAll(/(\w+)\.(?:HandleFunc|Handle)\s*\(\s*["']([^"']*)["']\s*,\s*([a-zA-Z0-9_\.\(\)]+)\s*\)(?:\.Methods\s*\(\s*["']([^"']*)["']\s*\))?/g);
            for (const match of matches) {
                const method = match[4] || 'GET';
                addEndpoint('mux', method.toUpperCase(), match[2], match[1], match[3]);
            }
        }
    }

    private registerGroup(newVar: string, parentVar: string, newPath: string, routeGroups: Record<string, string>) {
        const parentPath = routeGroups[parentVar] || '';
        let fullPath = (parentPath + '/' + newPath).replace(/\/+/g, '/');
        if (fullPath !== '/' && fullPath.endsWith('/')) {
            fullPath = fullPath.slice(0, -1);
        }
        routeGroups[newVar] = fullPath;
    }

    /**
     * Normalize multi-line statements by joining continued lines
     */
    private normalizeMultiLineStatements(content: string): { content: string, mapping: number[] } {
        const lines = content.split('\n');
        const normalized: string[] = [];
        const mapping: number[] = [];
        let currentStatement = '';
        let startLineOfStatement = 0;
        let inRouteDefinition = false;
        let parenDepth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Detect start of route definition or Group
            const isStart = /\w+\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS|Get|Post|Put|Patch|Delete|Options|Head|Group|Route|Mount|HandleFunc|Handle)\s*\(/.test(trimmed);
            
            if (!inRouteDefinition && isStart) {
                inRouteDefinition = true;
                parenDepth = 0;
                startLineOfStatement = i + 1;
                currentStatement = '';
            }

            if (inRouteDefinition) {
                for (const char of line) {
                    if (char === '(') parenDepth++;
                    if (char === ')') parenDepth--;
                }

                currentStatement += (currentStatement ? ' ' : '') + trimmed;

                if (parenDepth === 0) {
                    normalized.push(currentStatement);
                    mapping.push(startLineOfStatement);
                    currentStatement = '';
                    inRouteDefinition = false;
                }
            } else {
                normalized.push(line);
                mapping.push(i + 1);
            }
        }

        // Clean up any unfinished statement
        if (currentStatement) {
            normalized.push(currentStatement);
            mapping.push(startLineOfStatement);
        }

        return { content: normalized.join('\n'), mapping };
    }

    findEndpointAtLine(content: string, lineNumber: number, fileName: string): EndpointInfo | null {
        const result = this.parse(content, fileName);

        const closestEndpoint = result.endpoints
            .filter(ep => ep.line <= lineNumber)
            .sort((a, b) => b.line - a.line)[0];

        return closestEndpoint || null;
    }

    extractPathParams(path: string): string[] {
        const params: string[] = [];

        // Support both :id (Gin/Fiber) and {id} (Chi/Mux/Echo)
        const paramRegex = /[:*](\w+)|\{(\w+)\}/g;
        let match;

        while ((match = paramRegex.exec(path)) !== null) {
            params.push(match[1] || match[2]);
        }

        return params;
    }
}
