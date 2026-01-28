import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EndpointInfo } from '../parser/types';
import { EnvironmentManager } from '../config/environmentManager';
import { HttpClient, HttpRequest } from '../client/httpClient';
import { Logger } from '../utils/logger';

export class WebviewPanel {
    private panel: vscode.WebviewPanel | undefined;
    private envManager: EnvironmentManager;
    private httpClient: HttpClient;
    private currentEndpoint: EndpointInfo | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.envManager = new EnvironmentManager();
        this.httpClient = new HttpClient();
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

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'ready':
                if (this.currentEndpoint) {
                    this.populateRequest(this.currentEndpoint);
                }
                this.sendEnvironments();
                break;

            case 'sendRequest':
                await this.handleSendRequest(message.data);
                break;

            case 'changeEnvironment':
                await this.envManager.setActiveEnvironment(message.data);
                break;
        }
    }

    private async handleSendRequest(data: any) {
        try {
            const baseUrl = this.envManager.getActiveBaseUrl();
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

    private getHtmlContent(): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'ui', 'index.html');

        try {
            return fs.readFileSync(htmlPath, 'utf8');
        } catch (error) {
            Logger.error('Failed to load webview HTML', error);
            return '<html><body><h1>Error loading webview</h1></body></html>';
        }
    }
}
