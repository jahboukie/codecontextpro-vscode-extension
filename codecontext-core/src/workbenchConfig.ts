/**
 * CodeContext Studio - Workbench Configuration
 * Sets up the perfect AI development layout
 */

import * as vscode from 'vscode';

export class WorkbenchConfig {
    
    /**
     * Configure the ideal CodeContext Studio layout
     */
    static async setupLayout() {
        const config = vscode.workspace.getConfiguration();
        
        // Set ideal layout configuration
        await config.update('workbench.activityBar.location', 'default', vscode.ConfigurationTarget.Global);
        await config.update('workbench.panel.defaultLocation', 'bottom', vscode.ConfigurationTarget.Global);
        await config.update('workbench.editor.enablePreview', false, vscode.ConfigurationTarget.Global);
        
        // Sidebar configuration - Chat on the right
        await config.update('workbench.sideBar.location', 'left', vscode.ConfigurationTarget.Global);
        
        // Panel configuration - Memory and workspace at bottom
        await config.update('workbench.panel.opensMaximized', 'never', vscode.ConfigurationTarget.Global);
        
        // Color theme for AI-focused development
        await config.update('workbench.colorTheme', 'Dark+ (default dark)', vscode.ConfigurationTarget.Global);
        
        // Configure CodeContext Studio specific settings
        await this.setCodeContextDefaults();
    }
    
    /**
     * Set CodeContext Studio specific defaults
     */
    private static async setCodeContextDefaults() {
        const config = vscode.workspace.getConfiguration();
        
        // Editor settings optimized for AI assistance
        await config.update('editor.wordWrap', 'on', vscode.ConfigurationTarget.Global);
        await config.update('editor.minimap.enabled', true, vscode.ConfigurationTarget.Global);
        await config.update('editor.fontSize', 14, vscode.ConfigurationTarget.Global);
        await config.update('editor.lineNumbers', 'on', vscode.ConfigurationTarget.Global);
        
        // Terminal settings
        await config.update('terminal.integrated.fontSize', 12, vscode.ConfigurationTarget.Global);
        
        // File explorer settings
        await config.update('explorer.confirmDelete', false, vscode.ConfigurationTarget.Global);
        await config.update('explorer.confirmDragAndDrop', false, vscode.ConfigurationTarget.Global);
    }
    
    /**
     * Open the ideal CodeContext Studio layout
     */
    static async openIdealLayout() {
        try {
            // Open the AI chat in the activity bar
            await vscode.commands.executeCommand('codecontext.chat.focus');
            
            // Open memory panel at the bottom
            await vscode.commands.executeCommand('codecontext.memory.focus');
            
            // Show a welcome message about the layout
            vscode.window.showInformationMessage(
                '🎯 CodeContext Studio layout optimized! Chat on the right, Memory at bottom, Code in center.',
                'Got it!'
            );
            
        } catch (error) {
            console.log('Layout setup will complete when panels are ready');
        }
    }
    
    /**
     * Set up welcome tab with CodeContext Studio info
     */
    static async setupWelcomeTab() {
        // Create a welcome document
        const welcomeContent = `# 🧠 Welcome to CodeContext Studio!

## 🎯 Perfect AI Development Layout

Your workspace is optimized for AI-assisted development:

### 📁 **Left Sidebar: File Explorer**
- Browse your project files
- Full vertical height for easy navigation

### 💻 **Center: Code Editor** 
- Your main coding area
- Multiple tabs for different files
- Intelligent AI-powered suggestions

### 🤖 **Right Sidebar: AI Chat**
- Always-visible AI assistant
- Persistent memory across sessions
- Full vertical height for long conversations

### 🧠 **Bottom Panel: Memory & Workspace**
- **Memory tab**: See conversation history
- **Execution tab**: Code execution results
- **Terminal**: When you need command line

## 🚀 Quick Start

1. **Setup AI**: \`Ctrl+Shift+P\` → "CodeContext: Setup AI Providers"
2. **Start Chat**: \`Ctrl+Shift+C\` or click the robot icon 🤖
3. **Execute Code**: \`Ctrl+Shift+R\` (Pro feature)

## 🎁 7-Day Free Trial

You're currently on a **7-day free trial** with full persistent memory!

- ✅ **Memory**: AI remembers everything
- ✅ **Multiple AI providers**: Claude + GPT
- ✅ **1 project**: Full experience

**Upgrade to Pro ($59/month)** for unlimited projects + code execution.

---

**Ready to experience AI that never forgets?** Start chatting! 🧠✨
`;

        // Open the welcome content in a new editor
        const doc = await vscode.workspace.openTextDocument({
            content: welcomeContent,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    }
}