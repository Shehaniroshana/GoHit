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
                const path = match[2];
                const structName = match[3]; // Optional

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

        // Pre-process: normalize multi-line route definitions
        // Join lines that are clearly continuations (end with comma, start with whitespace)
        const normalizedContent = this.normalizeMultiLineStatements(content);
        const lines = normalizedContent.split('\n');

        const hasGin = /gin\.(?:Engine|Default|New|Group)/.test(content) || /"github\.com\/gin-gonic\/gin"/.test(content);
        const hasFiber = /fiber\.(?:App|New|Group)/.test(content) || /"github\.com\/gofiber\/fiber/.test(content);
        const hasEcho = /echo\.(?:Echo|New|Group)/.test(content) || /"github\.com\/labstack\/echo/.test(content);
        const hasNetHttp = /http\.HandleFunc|http\.Handle\(/.test(content) || /"net\/http"/.test(content);

        // Track variables that hold router groups and their prefixes
        const routeGroups: Record<string, string> = {
            'r': '', 'app': '', 'e': '', 'router': '', 'v1': '', 'api': ''
        };

        // Track original line numbers (after normalization, we need to map back)
        const lineMapping: number[] = [];
        let originalLineNum = 1;
        let currentOriginalLine = 1;
        const originalLines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            lineMapping[i] = currentOriginalLine;
            const normalizedLine = lines[i];
            let matchedOriginalLines = 0;
            let tempCurrentOriginalLine = currentOriginalLine - 1; // 0-indexed for array access

            // Try to find how many original lines this normalized line corresponds to
            let tempNormalizedLine = normalizedLine.trim();
            while (tempCurrentOriginalLine < originalLines.length && tempNormalizedLine.length > 0) {
                const originalLine = originalLines[tempCurrentOriginalLine].trim();
                if (tempNormalizedLine.startsWith(originalLine)) {
                    tempNormalizedLine = tempNormalizedLine.substring(originalLine.length).trim();
                    matchedOriginalLines++;
                } else {
                    // If it doesn't start, it might be a continuation that was joined
                    // This is a heuristic, might need refinement for complex cases
                    if (originalLine.length > 0 && tempNormalizedLine.includes(originalLine)) {
                        // If the original line is part of the normalized line, assume it's consumed
                        // This is a weak check, but better than nothing
                        matchedOriginalLines++;
                    }
                }
                tempCurrentOriginalLine++;
            }
            currentOriginalLine += Math.max(1, matchedOriginalLines);
        }


        lines.forEach((line, index) => {
            const lineNumber = lineMapping[index] || index + 1;
            const trimmedLine = line.trim();

            // 1. Detect Group definitions
            const groupMatch = trimmedLine.match(/(\w+)\s*:?=\s*(\w+)\.Group\s*\(\s*["']([^"']*)["']/);
            if (groupMatch) {
                const newVar = groupMatch[1];
                const parentVar = groupMatch[2];
                const newPath = groupMatch[3];
                const parentPath = routeGroups[parentVar] || '';

                let fullPath = (parentPath + '/' + newPath).replace(/\/+/g, '/');
                if (fullPath !== '/' && fullPath.endsWith('/')) {
                    fullPath = fullPath.slice(0, -1);
                }

                routeGroups[newVar] = fullPath;
                return;
            }

            // 2. Detect Endpoints
            if (hasNetHttp) {
                const httpMatch = line.match(/http\.HandleFunc\s*\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_\.]+)/);
                if (httpMatch) {
                    endpoints.push({
                        method: 'GET/POST',
                        path: httpMatch[1],
                        framework: 'net/http',
                        line: lineNumber,
                        handler: httpMatch[2]
                    });
                }
            }

            const addEndpoint = (framework: 'gin' | 'fiber' | 'echo', method: string, path: string, routerVar: string, handler: string) => {
                const prefix = routeGroups[routerVar] || '';
                let fullPath = (prefix + '/' + path).replace(/\/+/g, '/');
                if (fullPath !== '/' && fullPath.endsWith('/')) {
                    fullPath = fullPath.slice(0, -1);
                }

                // Heuristic: Detect WebSocket endpoints
                let finalMethod = method;
                const lowPath = fullPath.toLowerCase();
                const lowHandler = handler.toLowerCase();
                if (method === 'GET' && (
                    lowPath.endsWith('/ws') || 
                    lowPath.includes('/websocket') || 
                    lowPath.includes('/socket') ||
                    lowHandler.includes('ws') || 
                    lowHandler.includes('websocket') ||
                    lowHandler.includes('socket')
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

            const extractHandlers = (handlerString: string): string => {
                // Remove inline function definitions: func(...) { ... }
                handlerString = handlerString.replace(/func\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
                handlerString = handlerString.replace(/func\s*\([^)]*\)\s*error\s*\{[\s\S]*?\}/g, '');

                // Extract identifiers (function names, obj.method)
                const handlers = handlerString
                    .split(',')
                    .map(h => h.trim())
                    .map(h => {
                        // Extract just function/method name, ignore complex expressions
                        const match = h.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)/);
                        return match ? match[1] : '';
                    })
                    .filter(h => h.length > 0 && !h.startsWith('middleware.'));

                return handlers.join('|');
            };

            if (hasGin) {
                const ginMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (ginMatch) {
                    const handlerChain = extractHandlers(ginMatch[4]);
                    if (handlerChain) {
                        addEndpoint('gin', ginMatch[2].toUpperCase(), ginMatch[3], ginMatch[1], handlerChain);
                    }
                }
            }

            if (hasFiber) {
                const fiberMatch = line.match(/(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (fiberMatch) {
                    const handlerChain = extractHandlers(fiberMatch[4]);
                    if (handlerChain) {
                        addEndpoint('fiber', fiberMatch[2].toUpperCase(), fiberMatch[3], fiberMatch[1], handlerChain);
                    }
                }
            }

            if (hasEcho) {
                const echoMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (echoMatch) {
                    const handlerChain = extractHandlers(echoMatch[4]);
                    if (handlerChain) {
                        addEndpoint('echo', echoMatch[2], echoMatch[3], echoMatch[1], handlerChain);
                    }
                }
            }
        });

        return endpoints;
    }

    /**
     * Normalize multi-line statements by joining continued lines
     */
    private normalizeMultiLineStatements(content: string): string {
        const lines = content.split('\n');
        const normalized: string[] = [];
        let currentStatement = '';
        let inRouteDefinition = false;
        let parenDepth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Detect start of route definition
            // Look for routerVar.METHOD("/path", ...)
            if (/\w+\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|Get|Post|Put|Patch|Delete|Options|Head)\s*\(/.test(trimmed)) {
                inRouteDefinition = true;
                parenDepth = 0; // Reset depth for new statement
            }

            if (inRouteDefinition) {
                // Track parentheses depth
                for (const char of line) {
                    if (char === '(') parenDepth++;
                    if (char === ')') parenDepth--;
                }

                // Accumulate line
                currentStatement += (currentStatement ? ' ' : '') + trimmed;

                // End of statement when parentheses are balanced and it's not just a group definition
                // A group definition also uses parentheses, but we want to keep them separate
                if (parenDepth === 0 && !trimmed.includes('.Group(')) {
                    normalized.push(currentStatement);
                    currentStatement = '';
                    inRouteDefinition = false;
                } else if (parenDepth === 0 && trimmed.includes('.Group(')) {
                    // If it's a group definition and parentheses are balanced, treat it as a single line
                    normalized.push(currentStatement);
                    currentStatement = '';
                    inRouteDefinition = false;
                }
            } else {
                // Regular line or a group definition that's not multi-line
                if (currentStatement) { // If there was an unfinished statement, push it
                    normalized.push(currentStatement);
                    currentStatement = '';
                }
                normalized.push(line);
            }
        }

        if (currentStatement) {
            normalized.push(currentStatement);
        }

        return normalized.join('\n');
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

        const paramRegex = /[:*](\w+)/g;
        let match;

        while ((match = paramRegex.exec(path)) !== null) {
            params.push(match[1]);
        }

        return params;
    }
}
