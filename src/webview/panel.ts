import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EndpointInfo } from '../parser/types';
import { EnvironmentManager } from '../config/environmentManager';
import { HttpClient, HttpRequest } from '../client/httpClient';
import { Logger } from '../utils/logger';
import { EndpointSuggestionService } from './endpointSuggestionService';

export class WebviewPanel {
    private panel: vscode.WebviewPanel | undefined;
    private envManager: EnvironmentManager;
    private httpClient: HttpClient;
    private currentEndpoint: EndpointInfo | null = null;
    private suggestionService: EndpointSuggestionService;

    constructor(private context: vscode.ExtensionContext) {
        this.envManager = new EnvironmentManager();
        this.httpClient = new HttpClient();
        this.suggestionService = new EndpointSuggestionService();

        // Collect endpoints in background
        this.suggestionService.collectEndpoints().catch(err => {
            Logger.error('Error collecting endpoints for suggestions', err);
        });
    }

    public show(endpoint: EndpointInfo, requestBody?: any) {
        this.currentEndpoint = endpoint;

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'gohitTester',
                'GoHit API Tester',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview', 'ui'))
                    ]
                }
            );

            this.panel.webview.html = this.getHtmlContent();

            this.panel.webview.onDidReceiveMessage(
                message => this.handleMessage(message),
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                null,
                this.context.subscriptions
            );
        }

        setTimeout(() => {
            this.populateRequest(endpoint, requestBody);
            this.sendEnvironments();
        }, 100);
    }

    /**
     * Show the panel without any endpoint (for auto-suggest testing)
     */
    public showEmpty() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'gohitTester',
                'GoHit API Tester',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview', 'ui'))
                    ]
                }
            );

            this.panel.webview.html = this.getHtmlContent();

            this.panel.webview.onDidReceiveMessage(
                message => this.handleMessage(message),
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                null,
                this.context.subscriptions
            );
        }

        setTimeout(() => {
            this.sendEnvironments();
            this.sendSuggestions(); // Send suggestions immediately
        }, 100);
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'ready':
                if (this.currentEndpoint) {
                    this.populateRequest(this.currentEndpoint);
                }
                this.sendEnvironments();
                this.sendSuggestions();
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
        }
    }

    private async handleSendRequest(data: any) {
        try {
            // Use baseUrl from request data if provided, otherwise use environment's baseUrl
            const baseUrl = data.baseUrl || this.envManager.getActiveBaseUrl();
            let url = data.url;

            // Prepend base URL if path is relative
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = baseUrl + (url.startsWith('/') ? url : '/' + url);
            }

            const request: HttpRequest = {
                url,
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
        this.panel?.webview.postMessage({
            type: 'populate',
            data: {
                method: endpoint.method,
                path: endpoint.path,
                body: body
            }
        });
    }

    private sendResponse(response: any) {
        this.panel?.webview.postMessage({
            type: 'response',
            data: response
        });
    }

    private sendEnvironments() {
        const config = this.envManager.getConfig();
        this.panel?.webview.postMessage({
            type: 'environments',
            data: config
        });
    }

    private sendSuggestions(query?: string) {
        const suggestions = query !== undefined
            ? this.suggestionService.getSuggestions(query)
            : this.suggestionService.getAllEndpoints();

        this.panel?.webview.postMessage({
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

    private getHtmlContent(): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'index.html');
        const cssPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'style.css');
        const jsPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'script.js');

        try {
            let html = fs.readFileSync(htmlPath, 'utf8');

            // Convert file paths to webview URIs
            const cssUri = this.panel!.webview.asWebviewUri(vscode.Uri.file(cssPath));
            const jsUri = this.panel!.webview.asWebviewUri(vscode.Uri.file(jsPath));

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
