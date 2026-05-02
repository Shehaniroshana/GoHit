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

            // Parse each file to extract endpoints
            for (const file of goFiles) {
                try {
                    // Use fs.readFile for better performance than openTextDocument
                    const fileData = await vscode.workspace.fs.readFile(file);
                    const content = Buffer.from(fileData).toString('utf8');
                    
                    if (!content.includes('gin') && !content.includes('fiber') && !content.includes('echo') && !content.includes('http') && !content.includes('@gohit') && !content.includes('Group')) {
                        continue; // Skip files that definitely don't have routes
                    }

                    const result = this.parser.parse(content, file.fsPath);

                    // Parse structs for body examples
                    const structs = this.analyzer.parseStructs(content);

                    for (const endpoint of result.endpoints) {
                        let bodyExample = undefined;

                        // Generate body example for methods that typically have request bodies
                        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
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

                                    // A. Check in current file
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

                                    // If we found a struct name using this candidate, we found the real handler!
                                    // Stop searching other candidates (middlewares).
                                    if (requestStructName) {
                                        Logger.debug(`Found struct ${requestStructName} in handler ${cleanCandidate}`);
                                        break;
                                    }
                                }
                            }

                            // 2. Fallback: Keyword matching in current file
                            if (!requestStructName) {
                                const fuzzyStruct = structs.find(s =>
                                    s.name.toLowerCase().includes('request') ||
                                    s.name.toLowerCase().includes('dto') ||
                                    s.name.toLowerCase().includes('input') ||
                                    s.name.toLowerCase().includes('create') ||
                                    s.name.toLowerCase().includes('update')
                                );
                                if (fuzzyStruct) {
                                    requestStructName = fuzzyStruct.name;
                                    Logger.debug(`Found struct via fuzzy match in current file: ${requestStructName}`);
                                }
                            }

                            // 3. UNIVERSAL FALLBACK: Scan ALL structs in workspace and match by path
                            if (!requestStructName) {
                                requestStructName = await this.findStructByPathMatching(goFiles, endpoint.path, endpoint.method);
                                if (requestStructName) {
                                    Logger.info(`[UNIVERSAL FALLBACK] Found struct ${requestStructName} for ${endpoint.method} ${endpoint.path}`);
                                }
                            }

                            // Generate JSON if we found a struct name
                                if (requestStructName) {
                                    let targetStruct: any = structs.find(s => s.name === requestStructName);
                                    let contextStructs: any[] = structs;

                                    if (!targetStruct) {
                                        Logger.info(`[STRUCT SEARCH] "${requestStructName}" not found in current file, searching workspace...`);
                                        const result = await this.findStructInWorkspace(goFiles, requestStructName);
                                        if (result) {
                                            targetStruct = result.struct;
                                            contextStructs = result.context;
                                            Logger.info(`[STRUCT SEARCH] ✓ Found "${targetStruct.name}" in workspace`);
                                        } else {
                                            Logger.warn(`[STRUCT SEARCH] ✗ Could not find struct "${requestStructName}" in workspace`);
                                        }
                                    }

                                    if (targetStruct) {
                                        bodyExample = this.analyzer.generateJSON(targetStruct, contextStructs);
                                        Logger.info(`✓ Generated body for ${endpoint.method} ${endpoint.path} from ${requestStructName}`);
                                    } else {
                                        Logger.warn(`✗ Could not find struct definition for ${requestStructName}`);
                                    }
                                } else {
                                Logger.debug(`✗ No struct found for ${endpoint.method} ${endpoint.path}`);
                            }
                        }

                        this.endpoints.push({
                            method: endpoint.method,
                            path: endpoint.path,
                            framework: endpoint.framework,
                            file: file.fsPath,
                            line: endpoint.line,
                            bodyExample
                        });
                    }
                } catch (error) {
                    Logger.error(`Error parsing file ${file.fsPath}`, error);
                }
            }

            Logger.info(`Collected ${this.endpoints.length} endpoints from workspace`);
        } catch (error) {
            Logger.error('Error collecting endpoints', error);
        }

        return this.endpoints;
    }

    /**
     * UNIVERSAL FALLBACK: Match struct by analyzing the endpoint path
     * E.g., /api/users/create => CreateUserRequest, UserCreateRequest, CreateUser, etc.
     */
    private async findStructByPathMatching(files: vscode.Uri[], path: string, method: string): Promise<string | null> {
        Logger.debug(`[UNIVERSAL FALLBACK] Searching for struct matching path: ${path}`);

        // Extract meaningful words from path
        const pathParts = path.split('/').filter(p => p && p !== 'api' && p !== 'v1' && p !== 'v2' && !p.startsWith(':'));

        // Generate possible struct name patterns
        const patterns: string[] = [];

        // Pattern 1: Method + Resource (CreateUser, UpdateProduct)
        const methodPrefix = method === 'POST' ? 'Create' : method === 'PUT' || method === 'PATCH' ? 'Update' : '';
        if (methodPrefix && pathParts.length > 0) {
            const resource = pathParts[pathParts.length - 1];
            const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
            patterns.push(`${methodPrefix}${this.capitalize(singular)}`);
        }

        // Pattern 2: Resource + Method (UserCreate, ProductUpdate)
        if (pathParts.length > 0) {
            const resource = pathParts[pathParts.length - 1];
            const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
            if (method === 'POST') patterns.push(`${this.capitalize(singular)}Create`);
            if (method === 'PUT' || method === 'PATCH') patterns.push(`${this.capitalize(singular)}Update`);
        }

        Logger.debug(`[UNIVERSAL FALLBACK] Generated patterns: ${patterns.join(', ')}`);

        // Search all files for structs matching these patterns
        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const content = document.getText();
                const allStructs = this.analyzer.parseStructs(content);

                for (const pattern of patterns) {
                    // Look for struct names that include the pattern + Request/Input/DTO
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
            } catch (e) {
                // Ignore file read errors
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
            // This regex now supports receivers and multi-line signatures (basic)
            const funcRegex = new RegExp(`func\\s+(?:\\([^)]+\\)\\s+)?${handlerName}\\s*\\(`, 'm');
            const funcMatch = content.match(funcRegex);

            if (!funcMatch || funcMatch.index === undefined) {
                return null;
            }

            // Extract function body (variable scope)
            const startIndex = funcMatch.index + funcMatch[0].length;
            let braceCount = 1;
            let endIndex = startIndex;

            for (let i = startIndex; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }

            const funcBody = content.substring(startIndex, endIndex);

            // Look for JSON binding calls
            // Common patterns:
            // Gin: c.BindJSON(&req), c.ShouldBindJSON(&req)
            // Fiber: c.BodyParser(&req)
            // Echo: c.Bind(&req)
            // net/http: json.NewDecoder(r.Body).Decode(&req)
            const bindRegex = /\.(?:BindJSON|ShouldBindJSON|BodyParser|Bind|Decode)\s*\(\s*&([a-zA-Z0-9_]+)/;
            const bindMatch = funcBody.match(bindRegex);

            if (bindMatch) {
                const varName = bindMatch[1];

                // 1. Check for standard var declaration: var req RequestType or var req models.RequestType
                const varDeclRegex = new RegExp(`var\\s+${varName}\\s+([a-zA-Z0-9_\\.]+)`);
                const varMatch = funcBody.match(varDeclRegex);
                if (varMatch) return varMatch[1];

                // 2. Check for short declaration: req := RequestType{}
                const shortDeclRegex = new RegExp(`${varName}\\s*:=\\s*([a-zA-Z0-9_\\.]+)\\s*{`);
                const shortMatch = funcBody.match(shortDeclRegex);
                if (shortMatch) return shortMatch[1];
            }

            return null;
        } catch (e) {
            return null;
        }
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
