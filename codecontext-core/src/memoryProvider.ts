/**
 * CodeContext Memory Tree Provider
 */

import * as vscode from 'vscode';
import { MemoryEngine } from './services/memoryEngine';

export class CodeContextMemoryProvider implements vscode.TreeDataProvider<MemoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MemoryItem | undefined | null | void> = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MemoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private memoryEngine: MemoryEngine) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MemoryItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MemoryItem): Promise<MemoryItem[]> {
        if (!element) {
            // Root level items
            return [
                new MemoryItem('Conversations', vscode.TreeItemCollapsibleState.Collapsed, 'conversations'),
                new MemoryItem('Code Patterns', vscode.TreeItemCollapsibleState.Collapsed, 'patterns'),
                new MemoryItem('Project Context', vscode.TreeItemCollapsibleState.Collapsed, 'context')
            ];
        }

        try {
            switch (element.contextValue) {
                case 'conversations':
                    return await this.getConversations();
                case 'patterns':
                    return await this.getCodePatterns();
                case 'context':
                    return await this.getProjectContext();
                default:
                    return [];
            }
        } catch (error) {
            console.error('Error fetching memory items:', error);
            return [];
        }
    }

    private async getConversations(): Promise<MemoryItem[]> {
        // Get recent conversations from memory
        const conversations = await this.memoryEngine.getRecentConversations(10);
        return conversations.map(conv => {
            const truncated = conv.message.length > 50 ? conv.message.substring(0, 50) + '...' : conv.message;
            const item = new MemoryItem(
                truncated,
                vscode.TreeItemCollapsibleState.None,
                'conversation'
            );
            item.description = new Date(conv.timestamp).toLocaleDateString();
            item.tooltip = `AI: ${conv.aiProvider}\nFull message: ${conv.message}`;
            return item;
        });
    }

    private async getCodePatterns(): Promise<MemoryItem[]> {
        // Get successful code patterns
        const patterns = await this.memoryEngine.getSuccessfulPatterns(10);
        return patterns.map(pattern => {
            const item = new MemoryItem(
                `${pattern.language} pattern`,
                vscode.TreeItemCollapsibleState.None,
                'pattern'
            );
            item.description = pattern.context.substring(0, 30) + '...';
            item.tooltip = `Language: ${pattern.language}\nContext: ${pattern.context}\nPattern: ${pattern.pattern}`;
            return item;
        });
    }

    private async getProjectContext(): Promise<MemoryItem[]> {
        const workspaceName = vscode.workspace.name || 'Unknown';
        const workspaceFolders = vscode.workspace.workspaceFolders?.length || 0;
        const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs).length;

        return [
            new MemoryItem(`Workspace: ${workspaceName}`, vscode.TreeItemCollapsibleState.None, 'info'),
            new MemoryItem(`Folders: ${workspaceFolders}`, vscode.TreeItemCollapsibleState.None, 'info'),
            new MemoryItem(`Open Files: ${openEditors}`, vscode.TreeItemCollapsibleState.None, 'info')
        ];
    }
}

class MemoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
        
        // Set icons based on context
        switch (contextValue) {
            case 'conversations':
                this.iconPath = new vscode.ThemeIcon('comment-discussion');
                break;
            case 'patterns':
                this.iconPath = new vscode.ThemeIcon('code');
                break;
            case 'context':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
            case 'conversation':
                this.iconPath = new vscode.ThemeIcon('comment');
                break;
            case 'pattern':
                this.iconPath = new vscode.ThemeIcon('file-code');
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
        }
    }
}