import * as vscode from 'vscode';
import axios from 'axios';
import WebSocket from 'ws';
import * as path from 'path';
import * as fs from 'fs';
import { EndpointInfo } from '../parser/types';
import { EnvironmentManager } from '../config/environmentManager';
import { HttpClient, HttpRequest } from '../client/httpClient';
import { Logger } from '../utils/logger';
import { EndpointSuggestionService } from './endpointSuggestionService';

export class GoHitViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gohit.testerView';
    private _view?: vscode.WebviewView;
    private envManager: EnvironmentManager;
    private httpClient: HttpClient;
    private currentEndpoint: EndpointInfo | null = null;
    private suggestionService: EndpointSuggestionService;
    private activeWs: WebSocket | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.envManager = new EnvironmentManager();
        this.httpClient = new HttpClient();
        this.suggestionService = new EndpointSuggestionService();

        // Collect endpoints in background
        this.suggestionService.collectEndpoints().catch(err => {
            Logger.error('Error collecting endpoints for suggestions', err);
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview', 'ui'))
            ]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );

        setTimeout(() => {
            this.sendEnvironments();
            this.sendSuggestions();
        }, 100);
    }

    public show(endpoint: EndpointInfo, requestBody?: any) {
        this.currentEndpoint = endpoint;
        
        // Focus the view if it exists
        if (this._view) {
            this._view.show?.(true); // show view, preserve focus
        } else {
            vscode.commands.executeCommand('gohit.testerView.focus');
        }

        setTimeout(() => {
            this.populateRequest(endpoint, requestBody);
        }, 500);
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'ready':
                if (this.currentEndpoint) {
                    this.populateRequest(this.currentEndpoint);
                }
                this.sendEnvironments();
                this.sendSuggestions();
                this.handleFetchModels();
                break;

            case 'sendRequest':
                await this.handleSendRequest(message.data);
                break;

            case 'changeEnvironment':
                await this.envManager.setActiveEnvironment(message.data);
                break;

            case 'searchEndpoints':
                this.handleSearchEndpoints(message.query);
                break;

            case 'refreshEndpoints':
                await this.handleRefreshEndpoints();
                break;

            case 'generateAIBody':
                await this.handleGenerateAIBody(message.data);
                break;

            case 'saveSettings':
                await this.handleSaveSettings(message.data);
                break;

            case 'fetchModels':
                await this.handleFetchModels();
                break;

            case 'addEnvironment':
                try {
                    await this.envManager.addEnvironment(message.data);
                    this.sendEnvironments();
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
                break;

            case 'deleteEnvironment':
                try {
                    await this.envManager.deleteEnvironment(message.data);
                    this.sendEnvironments();
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
                break;

            case 'wsSend':
                if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
                    this.activeWs.send(message.data);
                }
                break;

            case 'wsClose':
                if (this.activeWs) {
                    this.activeWs.close();
                    this.activeWs = null;
                }
                break;

            case 'error':
                vscode.window.showErrorMessage(message.data);
                break;

            case 'info':
                vscode.window.showInformationMessage(message.data);
                break;
        }
    }

    private async handleSaveSettings(data: { openRouterApiKey?: string, openRouterAiModel?: string, openRouterAiPrompt?: string }) {
        const config = vscode.workspace.getConfiguration('gohit');
        if (data.openRouterApiKey !== undefined) {
            await config.update('openRouterApiKey', data.openRouterApiKey, vscode.ConfigurationTarget.Global);
        }
        if (data.openRouterAiModel !== undefined) {
            await config.update('openRouterAiModel', data.openRouterAiModel, vscode.ConfigurationTarget.Global);
        }
        if (data.openRouterAiPrompt !== undefined) {
            await config.update('openRouterAiPrompt', data.openRouterAiPrompt, vscode.ConfigurationTarget.Global);
        }
        Logger.info('Settings saved from UI');
        this.sendEnvironments();
    }

    private async handleFetchModels() {
        try {
            const res = await axios.get('https://openrouter.ai/api/v1/models');
            const models = res.data.data.map((m: any) => {
                let isFree = false;
                if (m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0") {
                    isFree = true;
                }
                return {
                    id: m.id,
                    name: m.name,
                    isFree
                };
            });
            
            models.sort((a: any, b: any) => {
                if (a.isFree && !b.isFree) return -1;
                if (!a.isFree && b.isFree) return 1;
                return a.name.localeCompare(b.name);
            });

            this._view?.webview.postMessage({
                type: 'modelsList',
                data: models
            });
        } catch (e: any) {
            Logger.error('Failed to fetch OpenRouter models', e.message);
        }
    }

    private async handleSendRequest(data: any) {
        let fullUrl = data.url;
        if (data.baseUrl && !fullUrl.startsWith('http') && !fullUrl.startsWith('ws')) {
            const separator = data.baseUrl.endsWith('/') || fullUrl.startsWith('/') ? '' : '/';
            fullUrl = `${data.baseUrl}${separator}${fullUrl.startsWith('/') ? fullUrl.substring(1) : fullUrl}`;
        }

        const startTime = Date.now();

        if (data.method === 'WS') {
            try {
                if (this.activeWs) {
                    this.activeWs.close();
                }

                let wsUrl = fullUrl;
                if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
                if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
                if (!wsUrl.startsWith('ws')) wsUrl = 'ws://' + wsUrl;

                this.activeWs = new WebSocket(wsUrl);
                const ws = this.activeWs;
                
                ws.on('open', () => {
                    this._view?.webview.postMessage({
                        type: 'wsStatus',
                        data: { status: 'CONNECTED', url: wsUrl }
                    });

                    if (data.body) {
                        ws.send(typeof data.body === 'string' ? data.body : JSON.stringify(data.body));
                    }
                });

                ws.on('message', (message: any) => {
                    this._view?.webview.postMessage({
                        type: 'wsMessage',
                        data: {
                            type: 'received',
                            content: message.toString(),
                            time: Date.now()
                        }
                    });
                });

                ws.on('close', (code, reason) => {
                    this._view?.webview.postMessage({
                        type: 'wsStatus',
                        data: { status: 'CLOSED', code, reason: reason.toString() }
                    });
                    if (this.activeWs === ws) {
                        this.activeWs = null;
                    }
                });

                ws.on('error', (err: any) => {
                    this._view?.webview.postMessage({
                        type: 'wsStatus',
                        data: { status: 'ERROR', message: err.message }
                    });
                });

            } catch (error: any) {
                this._view?.webview.postMessage({
                    type: 'wsStatus',
                    data: { status: 'ERROR', message: error.message }
                });
            }
            return;
        }

        try {
            const request: HttpRequest = {
                url: fullUrl,
                method: data.method,
                headers: data.headers,
                body: data.body
            };

            Logger.info(`Sending ${request.method} request to ${request.url}`);

            const response = await this.httpClient.sendRequest(request);

            Logger.info(`Received response: ${response.status} ${response.statusText} (${response.time}ms)`);

            this.sendResponse(response);
        } catch (error) {
            Logger.error('Error sending request', error);
            vscode.window.showErrorMessage('Failed to send request: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    private populateRequest(endpoint: EndpointInfo, body?: any) {
        this._view?.webview.postMessage({
            type: 'populate',
            data: {
                method: endpoint.method,
                path: endpoint.path,
                body: body
            }
        });
    }

    private sendResponse(response: any) {
        this._view?.webview.postMessage({
            type: 'response',
            data: response
        });
    }

    private sendEnvironments() {
        const config = this.envManager.getConfig();
        const vsConfig = vscode.workspace.getConfiguration('gohit');
        const apiKey = vsConfig.get<string>('openRouterApiKey');
        const aiModel = vsConfig.get<string>('openRouterAiModel');
        const aiPrompt = vsConfig.get<string>('openRouterAiPrompt');
        
        this._view?.webview.postMessage({
            type: 'environments',
            data: {
                ...config,
                apiKey: apiKey || '',
                aiModel: aiModel || 'anthropic/claude-3-haiku',
                aiPrompt: aiPrompt || ''
            }
        });
    }

    private sendSuggestions(query?: string) {
        const suggestions = query !== undefined
            ? this.suggestionService.getSuggestions(query)
            : this.suggestionService.getAllEndpoints();

        this._view?.webview.postMessage({
            type: 'suggestions',
            data: suggestions
        });
    }

    private handleSearchEndpoints(query: string) {
        this.sendSuggestions(query);
    }

    private async handleRefreshEndpoints() {
        try {
            Logger.info('Refreshing endpoint suggestions...');
            await this.suggestionService.collectEndpoints();
            this.sendSuggestions();
            Logger.info('Endpoint suggestions refreshed');
        } catch (error) {
            Logger.error('Error refreshing endpoints', error);
        }
    }

    private async handleGenerateAIBody(data: { method: string, url: string, currentBody?: string }) {
        const config = vscode.workspace.getConfiguration('gohit');
        const apiKey = config.get<string>('openRouterApiKey');
        const aiModel = config.get<string>('openRouterAiModel') || 'anthropic/claude-3-haiku';
        const aiPrompt = config.get<string>('openRouterAiPrompt') || '';

        if (!apiKey) {
            vscode.window.showWarningMessage('OpenRouter API Key not set. Please set it using "GoHit: Set OpenRouter API Key" command.');
            this._view?.webview.postMessage({
                type: 'aiBodyGenerated',
                data: { error: 'OpenRouter API Key not set.' }
            });
            return;
        }

        Logger.info(`Generating AI body for ${data.method} ${data.url}`);

        // Try to find local body example for context
        const suggestions = this.suggestionService.getAllEndpoints();
        const match = suggestions.find(s => s.path === data.url && s.method === data.method);
        let contextInfo = '';
        if (match && match.bodyExample) {
            contextInfo = `\n\nHere is a template based on the Go struct for this endpoint:\n${JSON.stringify(match.bodyExample, null, 2)}`;
        }

        if (data.currentBody && data.currentBody !== '{}' && data.currentBody !== '[]') {
            contextInfo += `\n\nHere is the current body the user has (improve/vary this): \n${data.currentBody}`;
        }

        let systemPrompt = `You are a helpful assistant that generates JSON request bodies for API testing.
You are generating a request for a ${data.method} request to ${data.url}.${contextInfo}
ONLY return valid JSON. Do not include markdown formatting or explanations.`;

        if (aiPrompt) {
            systemPrompt += `\n\nUSER CUSTOM SKILLS/INSTRUCTIONS:\n${aiPrompt}`;
        }

        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: aiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Generate a realistic JSON request body for ${data.method} ${data.url}.` }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/GoHit',
                        'X-Title': 'GoHit'
                    }
                }
            );

            const rawContent = response.data.choices[0].message.content.trim();
            
            let jsonBody;
            try {
                let cleanContent = rawContent;
                // More robust extraction: find the first { and last }
                const startIdx = cleanContent.indexOf('{');
                const endIdx = cleanContent.lastIndexOf('}');
                
                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                    cleanContent = cleanContent.substring(startIdx, endIdx + 1);
                }
                
                jsonBody = JSON.parse(cleanContent);
            } catch (e) {
                Logger.error('Failed to parse AI response as JSON', e);
                throw new Error('AI returned invalid JSON: ' + rawContent);
            }

            this._view?.webview.postMessage({
                type: 'aiBodyGenerated',
                data: { body: jsonBody }
            });
            Logger.info('AI body generation successful');

        } catch (error) {
            Logger.error('Error generating AI body', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during AI generation';
            
            this._view?.webview.postMessage({
                type: 'aiBodyGenerated',
                data: { error: errorMessage }
            });
        }
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'index.html');
        const cssPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'style.css');
        const jsPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'script.js');

        try {
            let html = fs.readFileSync(htmlPath, 'utf8');

            // Convert file paths to webview URIs
            const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
            const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));

            // Replace the placeholder paths with actual webview URIs
            html = html.replace('href="style.css"', `href="${cssUri}"`);
            html = html.replace('src="script.js"', `src="${jsUri}"`);

            return html;
        } catch (error) {
            Logger.error('Failed to load webview HTML', error);
            return '<html><body><h1>Error loading webview</h1></body></html>';
        }
    }
}
