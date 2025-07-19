/**
 * CodeContext Studio - Built-in AI Assistant Extension
 * Integrates Claude, GPT, Memory, and Execution into VS Code Core
 */

import * as vscode from 'vscode';
import { CodeContextChatProvider } from './chatProvider';
import { CodeContextMemoryProvider } from './memoryProvider';
import { CodeContextExecutionProvider } from './executionProvider';
import { MemoryEngine } from './services/memoryEngine';
import { ExecutionEngine } from './services/mockExecutionEngine';
import AIProviderManager from './services/aiProviderManager';
import { TrialManager } from './services/trialManager';
import { WorkbenchConfig } from './workbenchConfig';
import { LicenseValidator } from './services/licenseValidator';
import { FeatureGuard } from './services/featureGuard';
import { LicenseCommands } from './commands/license';

let memoryEngine: MemoryEngine;
let executionEngine: ExecutionEngine;
let aiManager: AIProviderManager;
let trialManager: TrialManager;

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 CodeContext Pro - AI Assistant with Persistent Memory activated!');

    // Check for valid license first - CRITICAL REQUIREMENT
    const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
    
    if (!licenseKey) {
        // No license found - show prompt and limited functionality
        await promptForLicense(context);
        return; // Don't activate features until licensed
    }

    // Validate existing license
    const licenseValidator = LicenseValidator.getInstance();
    const validation = await licenseValidator.validateLicense(licenseKey);
    
    if (!validation.valid || !validation.active) {
        // Invalid license - show prompt and limited functionality
        await promptForInvalidLicense(context, validation.error);
        return; // Don't activate features until licensed
    }

    // License is valid - proceed with full activation
    console.log('✅ License validated - activating all features');

    // Show license status if expiring soon
    if (validation.daysRemaining && validation.daysRemaining <= 7) {
        vscode.window.showWarningMessage(
            `⚠️ Your license expires in ${validation.daysRemaining} days.`,
            'Renew Now'
        ).then(action => {
            if (action === 'Renew Now') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/renew'));
            }
        });
    }

    // Initialize core services
    await initializeServices(context);

    // Register providers
    registerProviders(context);

    // Register all commands (including license commands)
    registerCommands(context);
    LicenseCommands.registerCommands(context);

    // Setup the perfect CodeContext Pro layout
    await WorkbenchConfig.setupLayout();

    // Show success message
    vscode.window.showInformationMessage(
        `🧠 CodeContext Pro activated! ${validation.daysRemaining ? 
            `License valid for ${validation.daysRemaining} days.` : 'Unlimited access.'}`
    );

    // Open ideal layout after a moment
    setTimeout(async () => {
        await WorkbenchConfig.openIdealLayout();
        await WorkbenchConfig.setupWelcomeTab();
    }, 2000);
}

async function promptForLicense(context: vscode.ExtensionContext): Promise<void> {
    const action = await vscode.window.showInformationMessage(
        '🔑 CodeContext Pro requires a license key to function.',
        { modal: true },
        'Enter License Key',
        'Purchase License',
        'Learn More'
    );

    switch (action) {
        case 'Enter License Key':
            await vscode.commands.executeCommand('codecontext.enterLicense');
            break;
        case 'Purchase License':
            vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode?ref=activation'));
            break;
        case 'Learn More':
            vscode.env.openExternal(vscode.Uri.parse('https://docs.codecontextpro.com/vscode'));
            break;
    }
}

async function promptForInvalidLicense(context: vscode.ExtensionContext, error?: string): Promise<void> {
    const message = error || 'License expired or invalid';
    
    const action = await vscode.window.showErrorMessage(
        `❌ ${message}. Extension cannot function without valid license.`,
        { modal: true },
        'Enter New License',
        'Renew License',
        'Contact Support'
    );

    switch (action) {
        case 'Enter New License':
            await vscode.commands.executeCommand('codecontext.enterLicense');
            break;
        case 'Renew License':
            vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/renew'));
            break;
        case 'Contact Support':
            vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/support'));
            break;
    }
}

async function initializeServices(context: vscode.ExtensionContext) {
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

        // Initialize memory engine with full functionality for licensed users
        memoryEngine = new MemoryEngine(workspaceRoot);
        await memoryEngine.initialize();

        // Initialize execution engine
        const sandboxPath = vscode.Uri.joinPath(context.globalStorageUri, 'sandbox').fsPath;
        executionEngine = new ExecutionEngine(sandboxPath);

        // Initialize AI provider manager
        aiManager = new AIProviderManager(memoryEngine, executionEngine);

        // Load configuration and initialize providers
        const config = vscode.workspace.getConfiguration('codecontext');
        const anthropicKey = config.get<string>('anthropicApiKey');
        const openaiKey = config.get<string>('openaiApiKey');
        const defaultProvider = config.get<'claude' | 'gpt'>('defaultProvider') || 'claude';

        if (anthropicKey || openaiKey) {
            await aiManager.initializeProviders({
                anthropicKey,
                openaiKey,
                defaultProvider
            });
        }

        console.log('✅ CodeContext Pro services initialized');
    } catch (error) {
        console.error('❌ Failed to initialize CodeContext Pro services:', error);
        vscode.window.showErrorMessage('Failed to initialize CodeContext Pro services');
    }
}

function registerProviders(context: vscode.ExtensionContext) {
    // Register chat webview provider with license protection
    const chatProvider = new CodeContextChatProvider(context.extensionUri, aiManager, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codecontext.chat', chatProvider)
    );

    // Register memory tree provider
    const memoryProvider = new CodeContextMemoryProvider(memoryEngine);
    context.subscriptions.push(
        vscode.window.createTreeView('codecontext.memory', { treeDataProvider: memoryProvider })
    );

    // Register execution tree provider
    const executionProvider = new CodeContextExecutionProvider(executionEngine);
    context.subscriptions.push(
        vscode.window.createTreeView('codecontext.execution', { treeDataProvider: executionProvider })
    );
}

function registerCommands(context: vscode.ExtensionContext) {
    // Open Chat Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.openChat', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                await vscode.commands.executeCommand('workbench.view.extension.codecontext-chat');
                await vscode.commands.executeCommand('codecontext.chat.focus');
            }, 'AI Chat');
        })
    );

    // Setup Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.setup', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                await setupAIProviders();
            }, 'AI Provider Setup');
        })
    );

    // Execute Code Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.executeCode', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No active editor found');
                    return;
                }

                const selection = editor.selection;
                const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
                
                if (!code.trim()) {
                    vscode.window.showWarningMessage('No code selected for execution');
                    return;
                }

                try {
                    const language = editor.document.languageId;
                    const result = await executionEngine.executeCode({
                        id: `manual-${Date.now()}`,
                        language: language as any,
                        code,
                        projectContext: {
                            projectId: vscode.workspace.name || 'unknown',
                            workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                            techStack: [],
                            dependencies: {},
                            recentChanges: []
                        }
                    });

                    if (result.success) {
                        vscode.window.showInformationMessage(`✅ Code executed successfully! Output: ${result.output}`);
                    } else {
                        vscode.window.showErrorMessage(`❌ Code execution failed: ${result.errors.join(', ')}`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`❌ Execution error: ${error}`);
                }
            }, 'Code Execution');
        })
    );

    // Memory Dashboard Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.openMemory', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                await vscode.commands.executeCommand('codecontext.memory.focus');
            }, 'Memory Dashboard');
        })
    );

    // Upgrade Command - Always Available
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.upgrade', async () => {
            vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode?ref=upgrade'));
        })
    );

    // Export Memory Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.exportMemory', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                // TODO: Implement memory export functionality
                vscode.window.showInformationMessage('Memory export feature coming soon in Pro version!');
            }, 'Memory Export');
        })
    );

    // Import Memory Command - License Protected
    context.subscriptions.push(
        vscode.commands.registerCommand('codecontext.importMemory', async () => {
            await FeatureGuard.executeProtectedCommand(context, async () => {
                // TODO: Implement memory import functionality
                vscode.window.showInformationMessage('Memory import feature coming soon in Pro version!');
            }, 'Memory Import');
        })
    );
}

async function setupAIProviders() {
    const items = [
        {
            label: '🤖 Claude (Anthropic)',
            description: 'Setup Claude API key',
            provider: 'claude'
        },
        {
            label: '🎯 GPT (OpenAI)', 
            description: 'Setup GPT API key',
            provider: 'gpt'
        }
    ];

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Which AI provider would you like to setup?'
    });

    if (!selection) return;

    const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${selection.provider === 'claude' ? 'Anthropic' : 'OpenAI'} API key`,
        password: true,
        validateInput: (value) => {
            return value.trim().length === 0 ? 'API key cannot be empty' : undefined;
        }
    });

    if (!apiKey) return;

    // Save to VS Code settings
    const config = vscode.workspace.getConfiguration('codecontext');
    
    if (selection.provider === 'claude') {
        await config.update('anthropicApiKey', apiKey, vscode.ConfigurationTarget.Global);
    } else {
        await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
    }

    // Set as default if no default is set
    const defaultProvider = config.get<string>('defaultProvider');
    if (!defaultProvider) {
        await config.update('defaultProvider', selection.provider, vscode.ConfigurationTarget.Global);
    }

    // Re-initialize providers
    const anthropicKey = config.get<string>('anthropicApiKey');
    const openaiKey = config.get<string>('openaiApiKey');
    const currentDefault = config.get<'claude' | 'gpt'>('defaultProvider') || 'claude';

    await aiManager.initializeProviders({
        anthropicKey,
        openaiKey,
        defaultProvider: currentDefault
    });

    vscode.window.showInformationMessage(`✅ ${selection.provider.toUpperCase()} configured successfully!`);
}

export function deactivate() {
    console.log('CodeContext Studio deactivated');
}