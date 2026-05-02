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
        const normalizationResult = this.normalizeMultiLineStatements(content);
        const lines = normalizationResult.content.split('\n');
        const lineMapping = normalizationResult.mapping;

        const hasGin = /gin\.(?:Engine|Default|New|Group)/.test(content) || /"github\.com\/gin-gonic\/gin"/.test(content);
        const hasFiber = /fiber\.(?:App|New|Group)/.test(content) || /"github\.com\/gofiber\/fiber/.test(content);
        const hasEcho = /echo\.(?:Echo|New|Group)/.test(content) || /"github\.com\/labstack\/echo/.test(content);
        const hasNetHttp = /http\.HandleFunc|http\.Handle\(/.test(content) || /"net\/http"/.test(content);

        // Track variables that hold router groups and their prefixes
        const routeGroups: Record<string, string> = {
            'r': '', 'app': '', 'e': '', 'router': '', 'v1': '', 'api': ''
        };        lines.forEach((line, index) => {
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
                // Use a slightly better regex that handles one level of nested braces (heuristic)
                handlerString = handlerString.replace(/func\s*\([^)]*\)\s*(?:\w+\s+)?\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '[inline]');
                
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

                return handlers.length > 0 ? handlers.join('|') : 'anonymous';
            };

            if (hasGin) {
                const ginMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (ginMatch) {
                    const handlerChain = extractHandlers(ginMatch[4]);
                    addEndpoint('gin', ginMatch[2].toUpperCase(), ginMatch[3], ginMatch[1], handlerChain);
                }
            }

            if (hasFiber) {
                const fiberMatch = line.match(/(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (fiberMatch) {
                    const handlerChain = extractHandlers(fiberMatch[4]);
                    addEndpoint('fiber', fiberMatch[2].toUpperCase(), fiberMatch[3], fiberMatch[1], handlerChain);
                }
            }

            if (hasEcho) {
                const echoMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["']([^"']*)["']\s*,\s*(.+)/);
                if (echoMatch) {
                    const handlerChain = extractHandlers(echoMatch[4]);
                    addEndpoint('echo', echoMatch[2].toUpperCase(), echoMatch[3], echoMatch[1], handlerChain);
                }
            }
        });

        return endpoints;
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
            const isStart = /\w+\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|WS|Get|Post|Put|Patch|Delete|Options|Head|Group)\s*\(/.test(trimmed);
            
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

        const paramRegex = /[:*](\w+)/g;
        let match;

        while ((match = paramRegex.exec(path)) !== null) {
            params.push(match[1]);
        }

        return params;
    }
}
