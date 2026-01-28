import * as vscode from 'vscode';
import { Environment, EnvironmentConfig } from './types';

export class EnvironmentManager {
    private static readonly CONFIG_KEY = 'gohit';

    getEnvironments(): Environment[] {
        const config = vscode.workspace.getConfiguration(EnvironmentManager.CONFIG_KEY);
        const environments = config.get<Environment[]>('environments', []);

        if (environments.length === 0) {
            return [{
                name: 'local',
                baseUrl: 'http://localhost:8080'
            }];
        }

        return environments;
    }

    getActiveEnvironment(): string {
        const config = vscode.workspace.getConfiguration(EnvironmentManager.CONFIG_KEY);
        return config.get<string>('activeEnvironment', 'local');
    }

    async setActiveEnvironment(name: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(EnvironmentManager.CONFIG_KEY);
        await config.update('activeEnvironment', name, vscode.ConfigurationTarget.Workspace);
    }

    async addEnvironment(env: Environment): Promise<void> {
        const environments = this.getEnvironments();

        const exists = environments.some(e => e.name === env.name);
        if (exists) {
            throw new Error(`Environment "${env.name}" already exists`);
        }

        environments.push(env);
        await this.saveEnvironments(environments);
    }

    async updateEnvironment(name: string, updates: Partial<Environment>): Promise<void> {
        const environments = this.getEnvironments();
        const index = environments.findIndex(e => e.name === name);

        if (index === -1) {
            throw new Error(`Environment "${name}" not found`);
        }

        environments[index] = { ...environments[index], ...updates };
        await this.saveEnvironments(environments);
    }

    async deleteEnvironment(name: string): Promise<void> {
        const environments = this.getEnvironments();
        const filtered = environments.filter(e => e.name !== name);

        if (filtered.length === environments.length) {
            throw new Error(`Environment "${name}" not found`);
        }

        await this.saveEnvironments(filtered);

        const activeEnv = this.getActiveEnvironment();
        if (activeEnv === name && filtered.length > 0) {
            await this.setActiveEnvironment(filtered[0].name);
        }
    }

    getEnvironment(name: string): Environment | null {
        const environments = this.getEnvironments();
        return environments.find(e => e.name === name) || null;
    }

    getActiveBaseUrl(): string {
        const activeEnvName = this.getActiveEnvironment();
        const env = this.getEnvironment(activeEnvName);
        return env?.baseUrl || 'http://localhost:8080';
    }

    private async saveEnvironments(environments: Environment[]): Promise<void> {
        const config = vscode.workspace.getConfiguration(EnvironmentManager.CONFIG_KEY);
        await config.update('environments', environments, vscode.ConfigurationTarget.Workspace);
    }

    getConfig(): EnvironmentConfig {
        return {
            active: this.getActiveEnvironment(),
            environments: this.getEnvironments()
        };
    }
}
