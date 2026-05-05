import * as vscode from 'vscode';
import { GoParser } from '../parser/goParser';
import { EndpointInfo } from '../parser/types';
import { StructAnalyzer } from '../analyzer/structAnalyzer';
import { Logger } from '../utils/logger';

export interface EndpointSuggestion {
    method: string;
    path: string;
    framework: string;
    file: string;
    line: number;
    bodyExample?: any; // Optional request body example
    params?: string[]; // Path parameters like :id or {id}
    fields?: string[]; // List of fields for IntelliSense-like suggestions
}

export class EndpointSuggestionService {
    private parser: GoParser;
    private analyzer: StructAnalyzer;
    private endpoints: EndpointSuggestion[] = [];

    constructor() {
        this.parser = new GoParser();
        this.analyzer = new StructAnalyzer();
    }

    /**
     * Collect all endpoints from Go files in the workspace
     */
    /**
     * Collect all endpoints from Go files in the workspace
     */
    async collectEndpoints(): Promise<EndpointSuggestion[]> {
        this.endpoints = [];

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            Logger.warn('No workspace folders found');
            return this.endpoints;
        }

        try {
            // Find all .go files in the workspace
            const goFiles = await vscode.workspace.findFiles(
                '**/*.go',
                '{**/node_modules/**,**/vendor/**,**/.git/**}',
                1000 // limit to 1000 files
            );

            Logger.info(`Found ${goFiles.length} Go files to scan for endpoints`);

            // 1. Collect all structs once to avoid redundant workspace scans
            const allStructs = await this.collectAllStructs(goFiles);
            Logger.info(`[collectEndpoints] Collected ${allStructs.length} structs from workspace`);

            // Parse each file to extract endpoints
            for (const file of goFiles) {
                try {
                    // Use fs.readFile for better performance than openTextDocument
                    const fileData = await vscode.workspace.fs.readFile(file);
                    const content = Buffer.from(fileData).toString('utf8');
                    
                    if (!content.includes('gin') && !content.includes('fiber') && !content.includes('echo') && !content.includes('chi') && !content.includes('mux') && 
                        !content.includes('http') && !content.includes('@gohit') && !content.includes('Group') && !content.includes('Route') && !content.includes('Mount')) {
                        continue; // Skip files that definitely don't have routes
                    }

                    const result = this.parser.parse(content, file.fsPath);

                    // Parse structs for body examples
                    const structs = this.analyzer.parseStructs(content);

                    for (const endpoint of result.endpoints) {
                        let bodyExample = undefined;
                        let endpointFields: string[] | undefined = undefined;

                        // Generate body example for methods that typically have request bodies
                        if (['POST', 'PUT', 'PATCH', 'GET/POST', 'ANY', 'ALL'].includes(endpoint.method.toUpperCase())) {
                            let requestStructName: string | null = null;

                            // PRIORITY 0: If from annotation and struct name provided, use it directly
                            if (endpoint.framework === 'annotation' && endpoint.handler) {
                                requestStructName = endpoint.handler;
                                Logger.info(`[ANNOTATION] Using struct ${requestStructName} from @gohit annotation`);
                            }

                            // PRIORITY 1: Try to find strict match by analyzing handler function (The "Pro" way)
                            if (!requestStructName && endpoint.handler) {
                                // The handler string might contain multiple handlers separated by |
                                // e.g., "authMiddleware|validator|userHandler.Create"
                                const candidates = endpoint.handler.split('|');

                                for (const candidate of candidates) {
                                    // Clean the candidate name (remove potential comments or weird chars)
                                    const cleanCandidate = candidate.trim();
                                    if (!cleanCandidate) continue;

                                    // A. Check in current file or inline body
                                    if (cleanCandidate.startsWith('func')) {
                                        requestStructName = this.findRequestStructInBody(cleanCandidate);
                                    } else {
                                        requestStructName = this.findRequestStructInHandler(content, cleanCandidate);

                                        // B. Check external file (workspace) if not found and has dot
                                        if (!requestStructName && cleanCandidate.includes('.')) {
                                            const methodName = cleanCandidate.split('.').pop();
                                            if (methodName) {
                                                // 1. Try in current file with method name only
                                                requestStructName = this.findRequestStructInHandler(content, methodName);

                                                // 2. Try in workspace
                                                if (!requestStructName) {
                                                    requestStructName = await this.findStructInExternalHandler(goFiles, methodName);
                                                }
                                            }
                                        }
                                    }

                                    // If we found a struct name using this candidate, we found the real handler!
                                    // Stop searching other candidates (middlewares).
                                    if (requestStructName) {
                                        Logger.debug(`Found struct ${requestStructName} in handler ${cleanCandidate.startsWith('func') ? '<inline>' : cleanCandidate}`);
                                        break;
                                    }
                                }
                            }

                            // PRIORITY 2: Fuzzy matching in ALL structs (smartest fallback)
                            // Strictly disable fuzzy matching if path parameters are present to avoid incorrect suggestions
                            const hasPathParams = this.parser.extractPathParams(endpoint.path).length > 0;
                            if (!requestStructName && endpoint.handler && !hasPathParams) {
                                const handlerName = endpoint.handler.split('.').pop() || '';
                                if (handlerName && handlerName !== 'anonymous') {
                                    const fuzzyStruct = allStructs.find((s: any) => {
                                        const name = s.name.toLowerCase();
                                        const lowerHandler = handlerName.toLowerCase();
                                        return name.includes(lowerHandler) && 
                                               (name.includes('request') || name.includes('dto') || name.includes('input') || name.includes('req'));
                                    });
                                    if (fuzzyStruct) {
                                        requestStructName = fuzzyStruct.name;
                                        Logger.info(`[FUZZY MATCH] Found struct ${requestStructName} for handler ${handlerName}`);
                                    }
                                }
                            }

                            // 3. UNIVERSAL FALLBACK: Match struct by analyzing the endpoint path
                            // Disable this if we have path params, as it's likely a "param-only" API
                            if (!requestStructName && !hasPathParams) {
                                requestStructName = await this.findStructByPathMatching(goFiles, endpoint.path, endpoint.method);
                                if (requestStructName) {
                                    Logger.info(`[UNIVERSAL FALLBACK] Found struct ${requestStructName} for ${endpoint.method} ${endpoint.path}`);
                                }
                            }

                            if (requestStructName) {
                                const targetStruct = allStructs.find((s: any) => s.name === requestStructName) || structs.find((s: any) => s.name === requestStructName);
                                if (targetStruct) {
                                    bodyExample = this.analyzer.generateJSON(targetStruct, allStructs);
                                    endpointFields = targetStruct.fields.map((f: any) => f.jsonName || f.name);
                                    Logger.info(`✓ Generated body for ${endpoint.method} ${endpoint.path} from ${requestStructName}`);
                                } else {
                                    Logger.warn(`✗ Could not find struct definition for ${requestStructName}`);
                                }
                            }

                            // Smart fallback for WebSockets (AI-style suggestion)
                            if (endpoint.method === 'WS' && !bodyExample) {
                                bodyExample = {
                                    type: "ping",
                                    data: {},
                                    timestamp: new Date().toISOString()
                                };
                            }
                        }

                        this.endpoints.push({
                            method: endpoint.method,
                            path: endpoint.path,
                            framework: endpoint.framework,
                            file: file.fsPath,
                            line: endpoint.line,
                            bodyExample,
                            params: this.parser.extractPathParams(endpoint.path),
                            fields: endpointFields
                        });
                    }
                } catch (error) {
                    Logger.error(`Error parsing file ${file.fsPath}`, error);
                }
            }

            // Deduplicate: remove endpoints with same method + path + file
            const seen = new Set<string>();
            this.endpoints = this.endpoints.filter(ep => {
                const key = `${ep.method}:${ep.path}:${ep.file}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            Logger.info(`Collected ${this.endpoints.length} endpoints from workspace (after dedup)`);
        } catch (error) {
            Logger.error('Error collecting endpoints', error);
        }

        return this.endpoints;
    }

    /**
     * Last resort: Find a struct in the workspace that matches the endpoint path
     */
    private async findStructByPathMatching(files: vscode.Uri[], path: string, method: string): Promise<string | null> {
        // Only for methods that usually have bodies
        if (!['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            return null;
        }

        const pathSegments = path.toLowerCase().split(/[\\\\/]/).filter(s => s && s.length > 2 && s !== 'api' && s !== 'v1' && s !== 'v2');
        if (pathSegments.length === 0) return null;

        const allStructs = await this.collectAllStructs(files);
        const patterns: string[] = [];

        // Generate patterns based on path segments
        // e.g., /admin/users/create -> UserCreate, CreateUser
        const lastPart = pathSegments[pathSegments.length - 1];
        const secondLastPart = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : '';
        const resource = secondLastPart || lastPart;
        const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;

        if (lastPart === 'create' || method === 'POST') {
            patterns.push(`Create${this.capitalize(singular)}`);
            patterns.push(`${this.capitalize(singular)}Create`);
        } else if (lastPart === 'update' || method === 'PUT' || method === 'PATCH') {
            patterns.push(`Update${this.capitalize(singular)}`);
            patterns.push(`${this.capitalize(singular)}Update`);
        }
        
        patterns.push(this.capitalize(singular));

        Logger.debug(`[UNIVERSAL FALLBACK] Generated patterns: ${patterns.join(', ')}`);

        for (const pattern of patterns) {
            const matched = allStructs.find(s =>
                s.name === `${pattern}Request` ||
                s.name === `${pattern}Input` ||
                s.name === `${pattern}DTO` ||
                s.name === `${pattern}Req` ||
                s.name === pattern
            );

            if (matched) {
                Logger.debug(`[UNIVERSAL FALLBACK] Matched struct: ${matched.name}`);
                return matched.name;
            }
        }

        return null;
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Search for a handler function in all workspace files and try to extract the struct name
     */
    private async findStructInExternalHandler(files: vscode.Uri[], handlerName: string): Promise<string | null> {
        // Regex to match: func (recv) HandlerName(...) or func HandlerName(...)
        const funcRegex = new RegExp(`func\\s+(?:\\([^)]+\\)\\s+)?${handlerName}\\s*\\(`, 'm');

        for (const file of files) {
            try {
                // Optimization: Skip if file doesn't likely contain the handler (check file content without full parse??)
                // For now, we open them, but in a real large repo we might want to use ripgrep/vscode.findFiles with content pattern
                const document = await vscode.workspace.openTextDocument(file);
                const content = document.getText();

                if (funcRegex.test(content)) {
                    // Found the function definition! Analyze it using the same logic.
                    const structName = this.findRequestStructInHandler(content, handlerName);
                    if (structName) {
                        return structName;
                    }
                }
            } catch (e) {
                // Ignore errors reading files
            }
        }
        return null;
    }

    /**
     * Search for a struct definition by name in the workspace
     */
    private async findStructInWorkspace(files: vscode.Uri[], structName: string): Promise<{ struct: any, context: any[] } | null> {
        // Strip package prefix if present (e.g. "models.CreateRequest" -> "CreateRequest")
        const cleanStructName = structName.includes('.') ? structName.split('.').pop()! : structName;

        Logger.debug(`[findStructInWorkspace] Searching for "${structName}" (clean: "${cleanStructName}") in ${files.length} files`);

        const structRegex = new RegExp(`type\\s+${cleanStructName}\\s+struct`, 'm');

        for (const file of files) {
            try {
                const fileData = await vscode.workspace.fs.readFile(file);
                const content = Buffer.from(fileData).toString('utf8');

                if (structRegex.test(content)) {
                    Logger.debug(`[findStructInWorkspace] ✓ Found regex match in ${file.fsPath}`);
                    const structs = this.analyzer.parseStructs(content);
                    const found = structs.find(s => s.name === cleanStructName);
                    if (found) {
                        Logger.info(`[findStructInWorkspace] ✓ Successfully parsed struct: ${found.name}`);
                        return { struct: found, context: structs };
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
        Logger.warn(`[findStructInWorkspace] ✗ Struct "${cleanStructName}" not found in workspace`);
        return null;
    }


    /**
     * Analyze handler function body to find the struct used for JSON binding
     */
    private findRequestStructInHandler(content: string, handlerName: string): string | null {
        try {
            // Find function definition: func (recv) handlerName(...) { OR func handlerName(...) {
            const funcRegex = new RegExp(`func\\s+(?:\\([^)]+\\)\\s+)?${handlerName}\\s*\\(`, 'm');
            const funcMatch = content.match(funcRegex);

            if (!funcMatch || funcMatch.index === undefined) {
                return null;
            }

            // Extract function body correctly by finding the first { after the signature
            const startIndex = funcMatch.index + funcMatch[0].length;
            let bodyStart = -1;
            for (let i = startIndex; i < content.length; i++) {
                if (content[i] === '{') {
                    bodyStart = i;
                    break;
                }
            }
            if (bodyStart === -1) return null;

            let braceCount = 1;
            let endIndex = bodyStart;
            for (let i = bodyStart + 1; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }

            const funcBody = content.substring(bodyStart, endIndex + 1);
            return this.findRequestStructInBody(funcBody);
        } catch (e) {
            return null;
        }
    }

    /**
     * Analyze extracted function body to find the struct used for JSON binding
     */
    private findRequestStructInBody(funcBody: string): string | null {
        try {
            // Expanded binding patterns
            const bindingPatterns = [
                /\.ShouldBindJSON\(&(\w+)\)/,
                /\.BindJSON\(&(\w+)\)/,
                /\.ShouldBind\(&(\w+)\)/,
                /\.Bind\(&(\w+)\)/,
                /json\.NewDecoder\(.*\.Body\)\.Decode\(&(\w+)\)/,
                /c\.JSON\(&(\w+)\)/,
                /c\.BodyParser\(&(\w+)\)/
            ];

            for (const pattern of bindingPatterns) {
                const match = funcBody.match(pattern);
                if (!match) continue;

                const varName = match[1];
                
                // 1. Check for var declaration: var req RequestType
                const varDeclRegex = new RegExp(`var\\s+${varName}\\s+([a-zA-Z0-9_\\.]+)`);
                const varMatch = funcBody.match(varDeclRegex);
                if (varMatch) return varMatch[1];

                // 2. Check for short declaration: req := RequestType{} or req := &RequestType{}
                const shortDeclRegex = new RegExp(`${varName}\\s*:=\\s*(?:&)?([a-zA-Z0-9_\\.]+)\\s*{`);
                const shortMatch = funcBody.match(shortDeclRegex);
                if (shortMatch) return shortMatch[1];

                // 3. Check for new(): req := new(RequestType)
                const newRegex = new RegExp(`${varName}\\s*:=\\s*new\\s*\\(\\s*([a-zA-Z0-9_\\.]+)\\s*\\)`);
                const newMatch = funcBody.match(newRegex);
                if (newMatch) return newMatch[1];
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Collect all structs from all Go files in the workspace
     */
    private async collectAllStructs(files: vscode.Uri[]): Promise<any[]> {
        const allStructs: any[] = [];
        for (const file of files) {
            try {
                const fileData = await vscode.workspace.fs.readFile(file);
                const content = Buffer.from(fileData).toString('utf8');
                allStructs.push(...this.analyzer.parseStructs(content));
            } catch (e) {
                // Ignore
            }
        }
        return allStructs;
    }

    /**
     * Get endpoint suggestions based on search query
     */
    getSuggestions(query: string = ''): EndpointSuggestion[] {
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) {
            // Return all endpoints if no query
            return this.endpoints;
        }

        // Filter endpoints that match the query
        return this.endpoints.filter(endpoint => {
            const pathMatch = endpoint.path.toLowerCase().includes(normalizedQuery);
            const methodMatch = endpoint.method.toLowerCase().includes(normalizedQuery);
            return pathMatch || methodMatch;
        });
    }

    /**
     * Get all collected endpoints
     */
    getAllEndpoints(): EndpointSuggestion[] {
        return this.endpoints;
    }

    /**
     * Clear all collected endpoints
     */
    clear(): void {
        this.endpoints = [];
    }
}
