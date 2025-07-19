/**
 * CodeContext Chat Provider - Native VS Code Chat Interface
 */

import * as vscode from 'vscode';
import AIProviderManager, { EnhancedAIRequest } from './services/aiProviderManager';
import { FeatureGuard } from './services/featureGuard';

export class CodeContextChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codecontext.chat';
    
    private _view?: vscode.WebviewView;
    private _messageHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
    private _context?: vscode.ExtensionContext;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _aiManager: AIProviderManager,
        context?: vscode.ExtensionContext
    ) {
        this._context = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleUserMessage(data.message);
                    break;
                case 'switchProvider':
                    await this.switchProvider(data.provider);
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
            }
        });
    }

    private async handleUserMessage(message: string) {
        if (!message.trim()) return;

        // Check license before processing chat request
        if (this._context && !(await FeatureGuard.checkLicense(this._context))) {
            this._messageHistory.push({
                role: 'assistant',
                content: '🔑 License required to use AI Chat. Please enter your license key or purchase a license.'
            });
            this.updateChat();
            return;
        }

        // Add user message to history
        this._messageHistory.push({ role: 'user', content: message });
        this.updateChat();

        // Show thinking indicator
        this._view?.webview.postMessage({
            type: 'thinking',
            isThinking: true
        });

        try {
            // Get project context
            const projectContext = await this.getProjectContext();

            // Build AI request
            const request: EnhancedAIRequest = {
                message,
                projectContext: projectContext || undefined,
                executionRequired: true,
                memoryRetrieval: true
            };

            // Get AI response
            const response = await this._aiManager.enhancedChat(request);

            // Add assistant response to history
            this._messageHistory.push({ 
                role: 'assistant', 
                content: this.formatAIResponse(response) 
            });

            // Update chat
            this.updateChat();

        } catch (error) {
            console.error('Chat error:', error);
            this._messageHistory.push({
                role: 'assistant',
                content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            this.updateChat();
        } finally {
            // Hide thinking indicator
            this._view?.webview.postMessage({
                type: 'thinking',
                isThinking: false
            });
        }
    }

    private formatAIResponse(response: any): string {
        let formatted = response.response;

        if (response.code && response.code.length > 0) {
            formatted += '\\n\\n**Generated Code:**\\n';
            response.code.forEach((codeBlock: any, index: number) => {
                formatted += `\\n\`\`\`${codeBlock.language}\\n${codeBlock.code}\\n\`\`\`\\n`;
            });
        }

        if (response.executionResults && response.executionResults.length > 0) {
            formatted += '\\n**Execution Results:**\\n';
            response.executionResults.forEach((result: any, index: number) => {
                if (result.success) {
                    formatted += `✅ Success: ${result.output}\\n`;
                } else {
                    formatted += `❌ Error: ${result.errors.join(', ')}\\n`;
                }
            });
        }

        return formatted;
    }

    private async switchProvider(provider: 'claude' | 'gpt') {
        try {
            await this._aiManager.switchProvider(provider);
            this._view?.webview.postMessage({
                type: 'providerSwitched',
                provider: provider
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to switch to ${provider}: ${error}`);
        }
    }

    private clearChat() {
        this._messageHistory = [];
        this.updateChat();
    }

    private updateChat() {
        this._view?.webview.postMessage({
            type: 'updateChat',
            messages: this._messageHistory
        });
    }

    private async getProjectContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        return {
            projectId: vscode.workspace.name || 'unknown',
            workingDirectory: workspaceRoot,
            techStack: [], // TODO: Infer from package.json
            dependencies: {},
            recentChanges: []
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeContext AI Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background-color: var(--vscode-panel-background);
            border-radius: 5px;
        }
        
        .provider-switch {
            display: flex;
            gap: 5px;
        }
        
        .provider-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .provider-btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background-color: var(--vscode-panel-background);
            border-radius: 5px;
            margin-bottom: 10px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            word-wrap: break-word;
        }
        
        .user-message {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20px;
        }
        
        .assistant-message {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            margin-right: 20px;
        }
        
        .thinking {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            padding: 20px;
        }
        
        .input-container {
            display: flex;
            gap: 10px;
        }
        
        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            border-radius: 3px;
            font-family: inherit;
        }
        
        .send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 15px;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .send-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .clear-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 5px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>🧠 CodeContext AI</h3>
        <div class="provider-switch">
            <button class="provider-btn active" id="claude-btn" onclick="switchProvider('claude')">Claude</button>
            <button class="provider-btn" id="gpt-btn" onclick="switchProvider('gpt')">GPT</button>
            <button class="clear-btn" onclick="clearChat()">Clear</button>
        </div>
    </div>
    
    <div class="chat-container" id="chat-container">
        <div class="message assistant-message">
            👋 Welcome to CodeContext Studio! I'm your AI assistant with <strong>persistent memory</strong> - I remember everything!
            <br><br>
            🧠 <strong>Mind-blowing Memory Features:</strong>
            <br>• <strong>Never forget</strong> our conversations
            <br>• <strong>Learn</strong> from your coding patterns
            <br>• <strong>Remember</strong> project context across sessions
            <br>• <strong>Store</strong> architectural decisions
            <br><br>
            ⏰ <strong>7-day free trial</strong> - Experience memory that will blow your mind!
            <br>🚀 <strong>Code execution</strong> available in Pro version
            <br><br>
            Ask me anything - I'll remember it forever! 🧠✨
        </div>
    </div>
    
    <div class="input-container">
        <input type="text" class="input-field" id="message-input" placeholder="Ask me anything about your code..." 
               onkeypress="handleKeyPress(event)">
        <button class="send-btn" onclick="sendMessage()">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentProvider = 'claude';
        let isThinking = false;

        function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message || isThinking) return;
            
            // Add user message to chat
            addMessage('user', message);
            input.value = '';
            
            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        function switchProvider(provider) {
            if (isThinking) return;
            
            vscode.postMessage({
                type: 'switchProvider',
                provider: provider
            });
        }

        function clearChat() {
            vscode.postMessage({
                type: 'clearChat'
            });
        }

        function addMessage(role, content) {
            const container = document.getElementById('chat-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}-message\`;
            
            // Simple markdown-like formatting
            const formatted = content
                .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\\n\`\`\`/g, '<pre><code>$2</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
            
            messageDiv.innerHTML = formatted;
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        function showThinking(thinking) {
            const container = document.getElementById('chat-container');
            let thinkingDiv = document.querySelector('.thinking');
            
            if (thinking && !thinkingDiv) {
                thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'thinking';
                thinkingDiv.textContent = '🤔 AI is thinking...';
                container.appendChild(thinkingDiv);
                container.scrollTop = container.scrollHeight;
            } else if (!thinking && thinkingDiv) {
                thinkingDiv.remove();
            }
            
            isThinking = thinking;
        }

        function updateProviderButtons(provider) {
            document.querySelectorAll('.provider-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(\`\${provider}-btn\`).classList.add('active');
            currentProvider = provider;
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateChat':
                    const container = document.getElementById('chat-container');
                    container.innerHTML = \`<div class="message assistant-message">
                        👋 Welcome to CodeContext Studio! I'm your AI assistant with <strong>persistent memory</strong> - I remember everything!
                        <br><br>
                        🧠 <strong>Mind-blowing Memory Features:</strong>
                        <br>• <strong>Never forget</strong> our conversations
                        <br>• <strong>Learn</strong> from your coding patterns
                        <br>• <strong>Remember</strong> project context across sessions
                        <br>• <strong>Store</strong> architectural decisions
                        <br><br>
                        ⏰ <strong>7-day free trial</strong> - Experience memory that will blow your mind!
                        <br>🚀 <strong>Code execution</strong> available in Pro version
                        <br><br>
                        Ask me anything - I'll remember it forever! 🧠✨
                    </div>\`;
                    
                    message.messages.forEach(msg => {
                        addMessage(msg.role, msg.content);
                    });
                    break;
                    
                case 'thinking':
                    showThinking(message.isThinking);
                    break;
                    
                case 'providerSwitched':
                    updateProviderButtons(message.provider);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}