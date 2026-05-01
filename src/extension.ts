import * as vscode from 'vscode';
import { GoHitViewProvider } from './webview/panel';
import { EnvironmentManager } from './config/environmentManager';
import { Logger } from './utils/logger';

export function activate(context: vscode.ExtensionContext) {
    Logger.init();
    Logger.info('GoHit extension activated');

    const gohitProvider = new GoHitViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(GoHitViewProvider.viewType, gohitProvider)
    );

    const envManager = new EnvironmentManager();

    const manageEnvironmentsCommand = vscode.commands.registerCommand('gohit.manageEnvironments', async () => {
        try {
            const action = await vscode.window.showQuickPick(
                ['Add Environment', 'Delete Environment', 'Switch Environment', 'View Environments'],
                { placeHolder: 'Select an action' }
            );

            if (!action) {
                return;
            }

            switch (action) {
                case 'Add Environment':
                    await addEnvironment(envManager);
                    break;
                case 'Delete Environment':
                    await deleteEnvironment(envManager);
                    break;
                case 'Switch Environment':
                    await switchEnvironment(envManager);
                    break;
                case 'View Environments':
                    await viewEnvironments(envManager);
                    break;
            }
        } catch (error) {
            Logger.error('Error managing environments', error);
            vscode.window.showErrorMessage('Failed to manage environments: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    const setApiKeyCommand = vscode.commands.registerCommand('gohit.setOpenRouterApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenRouter API Key',
            password: true,
            placeHolder: 'sk-or-v1-...'
        });

        if (apiKey !== undefined) {
            await vscode.workspace.getConfiguration('gohit').update('openRouterApiKey', apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('OpenRouter API Key saved successfully.');
        }
    });

    context.subscriptions.push(manageEnvironmentsCommand, setApiKeyCommand);
}

async function addEnvironment(envManager: EnvironmentManager) {
    const name = await vscode.window.showInputBox({
        prompt: 'Environment name (e.g., dev, staging, prod)',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Name cannot be empty';
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                return 'Name can only contain letters, numbers, hyphens, and underscores';
            }
            return null;
        }
    });

    if (!name) {
        return;
    }

    const baseUrl = await vscode.window.showInputBox({
        prompt: 'Base URL (e.g., https://api.example.com)',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'URL cannot be empty';
            }
            try {
                new URL(value);
                return null;
            } catch {
                return 'Invalid URL format';
            }
        }
    });

    if (!baseUrl) {
        return;
    }

    try {
        await envManager.addEnvironment({ name, baseUrl });
        vscode.window.showInformationMessage(`Environment "${name}" added successfully`);
    } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Failed to add environment');
    }
}

async function deleteEnvironment(envManager: EnvironmentManager) {
    const environments = envManager.getEnvironments();

    if (environments.length === 0) {
        vscode.window.showWarningMessage('No environments to delete');
        return;
    }

    const envName = await vscode.window.showQuickPick(
        environments.map(e => e.name),
        { placeHolder: 'Select environment to delete' }
    );

    if (!envName) {
        return;
    }

    try {
        await envManager.deleteEnvironment(envName);
        vscode.window.showInformationMessage(`Environment "${envName}" deleted successfully`);
    } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Failed to delete environment');
    }
}

async function switchEnvironment(envManager: EnvironmentManager) {
    const environments = envManager.getEnvironments();

    if (environments.length === 0) {
        vscode.window.showWarningMessage('No environments configured');
        return;
    }

    const current = envManager.getActiveEnvironment();

    const envName = await vscode.window.showQuickPick(
        environments.map(e => ({
            label: e.name,
            description: e.baseUrl,
            detail: e.name === current ? 'Currently active' : undefined
        })),
        { placeHolder: 'Select environment to activate' }
    );

    if (!envName) {
        return;
    }

    try {
        await envManager.setActiveEnvironment(envName.label);
        vscode.window.showInformationMessage(`Switched to "${envName.label}" environment`);
    } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Failed to switch environment');
    }
}

async function viewEnvironments(envManager: EnvironmentManager) {
    const environments = envManager.getEnvironments();
    const current = envManager.getActiveEnvironment();

    if (environments.length === 0) {
        vscode.window.showInformationMessage('No environments configured');
        return;
    }

    const message = environments
        .map(e => `${e.name === current ? '✓' : ' '} ${e.name}: ${e.baseUrl}`)
        .join('\n');

    vscode.window.showInformationMessage(message, { modal: true });
}



export function deactivate() {
    Logger.info('GoHit extension deactivated');
}
