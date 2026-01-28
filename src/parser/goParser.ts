import { EndpointInfo, ParseResult } from './types';

export class GoParser {
    parse(content: string, fileName: string): ParseResult {
        const endpoints: EndpointInfo[] = [];
        const lines = content.split('\n');

        const hasGin = /gin\..*gin\.Engine|gin\.Default\(\)|gin\.New\(\)/.test(content);
        const hasFiber = /fiber\..*fiber\.App|fiber\.New\(\)/.test(content);
        const hasEcho = /echo\..*echo\.Echo|echo\.New\(\)/.test(content);
        const hasNetHttp = /http\.HandleFunc|http\.Handle\(/.test(content);

        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            if (hasNetHttp || (!hasGin && !hasFiber && !hasEcho)) {
                const httpMatch = line.match(/http\.HandleFunc\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)\s*\)/);
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

            if (hasGin) {
                const ginMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["']([^"']+)["']/);
                if (ginMatch) {
                    endpoints.push({
                        method: ginMatch[2],
                        path: ginMatch[3],
                        framework: 'gin',
                        line: lineNumber
                    });
                }
            }

            if (hasFiber) {
                const fiberMatch = line.match(/(\w+)\.(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*["']([^"']+)["']/);
                if (fiberMatch) {
                    endpoints.push({
                        method: fiberMatch[2].toUpperCase(),
                        path: fiberMatch[3],
                        framework: 'fiber',
                        line: lineNumber
                    });
                }
            }

            if (hasEcho) {
                const echoMatch = line.match(/(\w+)\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["']([^"']+)["']/);
                if (echoMatch) {
                    endpoints.push({
                        method: echoMatch[2],
                        path: echoMatch[3],
                        framework: 'echo',
                        line: lineNumber
                    });
                }
            }
        });

        return {
            endpoints,
            hasHandlers: endpoints.length > 0
        };
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
