/**
 * CodeContext Execution Tree Provider
 */

import * as vscode from 'vscode';
import { ExecutionEngine } from './services/mockExecutionEngine';

export class CodeContextExecutionProvider implements vscode.TreeDataProvider<ExecutionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ExecutionItem | undefined | null | void> = new vscode.EventEmitter<ExecutionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ExecutionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private executionHistory: Array<{
        id: string;
        language: string;
        code: string;
        result: any;
        timestamp: Date;
    }> = [];

    constructor(private executionEngine: ExecutionEngine) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    addExecution(id: string, language: string, code: string, result: any) {
        this.executionHistory.unshift({
            id,
            language,
            code,
            result,
            timestamp: new Date()
        });

        // Keep only last 20 executions
        if (this.executionHistory.length > 20) {
            this.executionHistory = this.executionHistory.slice(0, 20);
        }

        this.refresh();
    }

    getTreeItem(element: ExecutionItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ExecutionItem): Promise<ExecutionItem[]> {
        if (!element) {
            // Root level - show execution history
            if (this.executionHistory.length === 0) {
                return [
                    new ExecutionItem(
                        'No executions yet',
                        vscode.TreeItemCollapsibleState.None,
                        'empty'
                    )
                ];
            }

            return this.executionHistory.map(exec => {
                const status = exec.result.success ? '✅' : '❌';
                const item = new ExecutionItem(
                    `${status} ${exec.language} - ${exec.timestamp.toLocaleTimeString()}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'execution'
                );
                item.execution = exec;
                item.description = exec.result.success ? 'Success' : 'Failed';
                item.tooltip = `Language: ${exec.language}\nStatus: ${exec.result.success ? 'Success' : 'Failed'}\nTime: ${exec.timestamp.toLocaleString()}`;
                return item;
            });
        } else if (element.contextValue === 'execution' && element.execution) {
            // Show execution details
            const exec = element.execution;
            const items: ExecutionItem[] = [];

            // Code snippet
            const codePreview = exec.code.length > 100 ? exec.code.substring(0, 100) + '...' : exec.code;
            const codeItem = new ExecutionItem(
                'Code',
                vscode.TreeItemCollapsibleState.None,
                'code'
            );
            codeItem.description = codePreview;
            codeItem.tooltip = exec.code;
            items.push(codeItem);

            // Result
            if (exec.result.success) {
                const outputItem = new ExecutionItem(
                    'Output',
                    vscode.TreeItemCollapsibleState.None,
                    'output'
                );
                outputItem.description = exec.result.output || 'No output';
                outputItem.tooltip = exec.result.output;
                items.push(outputItem);

                // Execution stats
                if (exec.result.executionTime) {
                    const timeItem = new ExecutionItem(
                        'Execution Time',
                        vscode.TreeItemCollapsibleState.None,
                        'stat'
                    );
                    timeItem.description = `${exec.result.executionTime}ms`;
                    items.push(timeItem);
                }

                if (exec.result.memoryUsage) {
                    const memoryItem = new ExecutionItem(
                        'Memory Usage',
                        vscode.TreeItemCollapsibleState.None,
                        'stat'
                    );
                    memoryItem.description = `${(exec.result.memoryUsage / 1024 / 1024).toFixed(2)}MB`;
                    items.push(memoryItem);
                }
            } else {
                // Errors
                exec.result.errors.forEach((error: string, index: number) => {
                    const errorItem = new ExecutionItem(
                        `Error ${index + 1}`,
                        vscode.TreeItemCollapsibleState.None,
                        'error'
                    );
                    errorItem.description = error.length > 50 ? error.substring(0, 50) + '...' : error;
                    errorItem.tooltip = error;
                    items.push(errorItem);
                });
            }

            return items;
        }

        return [];
    }
}

class ExecutionItem extends vscode.TreeItem {
    public execution?: {
        id: string;
        language: string;
        code: string;
        result: any;
        timestamp: Date;
    };

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
        
        // Set icons based on context
        switch (contextValue) {
            case 'execution':
                this.iconPath = new vscode.ThemeIcon('play');
                break;
            case 'code':
                this.iconPath = new vscode.ThemeIcon('file-code');
                break;
            case 'output':
                this.iconPath = new vscode.ThemeIcon('output');
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case 'stat':
                this.iconPath = new vscode.ThemeIcon('graph');
                break;
            case 'empty':
                this.iconPath = new vscode.ThemeIcon('circle-slash');
                break;
        }
    }
}