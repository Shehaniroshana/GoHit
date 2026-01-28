import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static init() {
        this.outputChannel = vscode.window.createOutputChannel('GoHit');
    }

    static info(message: string) {
        this.log('INFO', message);
    }

    static error(message: string, error?: any) {
        this.log('ERROR', message);
        if (error) {
            this.log('ERROR', error.toString());
            if (error.stack) {
                this.log('ERROR', error.stack);
            }
        }
    }

    static warn(message: string) {
        this.log('WARN', message);
    }

    static debug(message: string) {
        this.log('DEBUG', message);
    }

    private static log(level: string, message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        this.outputChannel.appendLine(logMessage);
    }

    static show() {
        this.outputChannel.show();
    }
}
