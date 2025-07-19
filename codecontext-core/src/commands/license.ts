/**
 * CodeContext Pro - License Management Commands
 * All license-related command implementations
 */

import * as vscode from 'vscode';
import { LicenseValidator } from '../services/licenseValidator';
import { FeatureGuard } from '../services/featureGuard';

export class LicenseCommands {
    private static licenseValidator = LicenseValidator.getInstance();

    static registerCommands(context: vscode.ExtensionContext): void {
        // Enter License Key Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.enterLicense', async () => {
                await this.enterLicenseKey(context);
            })
        );

        // Check License Status Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.checkLicense', async () => {
                await this.checkLicenseStatus(context);
            })
        );

        // Purchase License Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.purchaseLicense', () => {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode?ref=command'));
            })
        );

        // Renew License Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.renewLicense', () => {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/renew?ref=command'));
            })
        );

        // Contact Support Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.contactSupport', async () => {
                await this.contactSupport(context);
            })
        );

        // Diagnostics Command
        context.subscriptions.push(
            vscode.commands.registerCommand('codecontext.diagnostics', async () => {
                await this.copyDiagnostics(context);
            })
        );
    }

    private static async enterLicenseKey(context: vscode.ExtensionContext): Promise<void> {
        const licenseKey = await vscode.window.showInputBox({
            prompt: 'Enter your CodeContext Pro license key',
            placeHolder: 'CC_VSC_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxx',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.length < 10) {
                    return 'Please enter a valid license key';
                }
                if (!value.startsWith('CC_VSC_')) {
                    return 'Invalid license key format - must start with CC_VSC_';
                }
                if (!/^CC_VSC_[0-9a-f]{32}_\d{10}$/.test(value)) {
                    return 'Invalid license key format';
                }
                return null;
            }
        });

        if (!licenseKey) {
            return;
        }

        // Show validation progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Validating license key...",
            cancellable: false
        }, async () => {
            const validation = await this.licenseValidator.validateLicense(licenseKey);
            
            if (validation.valid && validation.active) {
                // Store license key
                await context.globalState.update('codecontext.licenseKey', licenseKey);
                
                vscode.window.showInformationMessage(
                    `✅ License activated successfully! ${validation.daysRemaining ? 
                        `Valid for ${validation.daysRemaining} days.` : 'Unlimited access.'}`
                );

                // Offer to restart extension
                const restart = await vscode.window.showInformationMessage(
                    'Restart VS Code to activate all features?',
                    'Restart Now',
                    'Later'
                );

                if (restart === 'Restart Now') {
                    await vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            } else {
                vscode.window.showErrorMessage(
                    `❌ License validation failed: ${validation.error || 'Invalid or expired license'}`
                );
            }
        });
    }

    private static async checkLicenseStatus(context: vscode.ExtensionContext): Promise<void> {
        const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
        
        if (!licenseKey) {
            const action = await vscode.window.showInformationMessage(
                '🔑 No license key found.',
                'Enter License Key',
                'Purchase License'
            );
            
            if (action === 'Enter License Key') {
                await this.enterLicenseKey(context);
            } else if (action === 'Purchase License') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode'));
            }
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Checking license status...",
            cancellable: false
        }, async () => {
            const validation = await this.licenseValidator.validateLicense(licenseKey);
            
            if (validation.valid && validation.active) {
                const message = validation.daysRemaining ? 
                    `✅ License is valid and active. Expires in ${validation.daysRemaining} days.` :
                    '✅ License is valid and active.';
                    
                const actions = ['OK'];
                if (validation.daysRemaining && validation.daysRemaining <= 30) {
                    actions.unshift('Renew Now');
                }
                
                const action = await vscode.window.showInformationMessage(message, ...actions);
                
                if (action === 'Renew Now') {
                    vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/renew'));
                }
            } else {
                const action = await vscode.window.showErrorMessage(
                    `❌ License invalid: ${validation.error || 'Unknown error'}`,
                    'Enter New License',
                    'Purchase License',
                    'Contact Support'
                );
                
                switch (action) {
                    case 'Enter New License':
                        await this.enterLicenseKey(context);
                        break;
                    case 'Purchase License':
                        vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode'));
                        break;
                    case 'Contact Support':
                        await this.contactSupport(context);
                        break;
                }
            }
        });
    }

    private static async contactSupport(context: vscode.ExtensionContext): Promise<void> {
        const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
        const maskedKey = licenseKey ? `${licenseKey.slice(0, 10)}...` : 'none';
        
        const supportUrl = `https://codecontextpro.com/support?license=${encodeURIComponent(maskedKey)}&source=vscode`;
        vscode.env.openExternal(vscode.Uri.parse(supportUrl));
    }

    private static async copyDiagnostics(context: vscode.ExtensionContext): Promise<void> {
        try {
            const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
            const status = await FeatureGuard.getLicenseStatus(context);
            
            const diagnostics = {
                extension: {
                    name: 'codecontext-pro',
                    version: context.extension?.packageJSON.version || 'unknown',
                    publisher: 'codecontextpro'
                },
                license: {
                    hasKey: !!licenseKey,
                    keyPrefix: licenseKey ? licenseKey.slice(0, 10) + '...' : 'none',
                    valid: status.valid,
                    daysRemaining: status.daysRemaining,
                    expiresAt: status.expiresAt?.toISOString()
                },
                environment: {
                    vscodeVersion: vscode.version,
                    platform: process.platform,
                    nodeVersion: process.version,
                    timestamp: new Date().toISOString()
                },
                workspace: {
                    workspaceFolders: vscode.workspace.workspaceFolders?.length || 0,
                    workspaceName: vscode.workspace.name || 'untitled'
                }
            };

            const diagnosticsText = JSON.stringify(diagnostics, null, 2);
            
            await vscode.env.clipboard.writeText(diagnosticsText);
            vscode.window.showInformationMessage(
                '📋 Diagnostic information copied to clipboard. Include this when contacting support.'
            );
            
        } catch (error) {
            console.error('Failed to generate diagnostics:', error);
            vscode.window.showErrorMessage('Failed to generate diagnostic information');
        }
    }

    /**
     * Get current license status for internal use
     */
    static async getCurrentLicenseStatus(context: vscode.ExtensionContext) {
        return await FeatureGuard.getLicenseStatus(context);
    }
}

export default LicenseCommands;