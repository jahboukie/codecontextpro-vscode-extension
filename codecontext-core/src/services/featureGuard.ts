/**
 * CodeContext Pro - Feature Protection Guard
 * Ensures all features are protected by license validation
 */

import * as vscode from 'vscode';
import { LicenseValidator } from './licenseValidator';

export class FeatureGuard {
    private static licenseValidator = LicenseValidator.getInstance();

    /**
     * Check if user has valid license for feature access
     */
    static async checkLicense(context: vscode.ExtensionContext): Promise<boolean> {
        const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
        
        if (!licenseKey) {
            await this.showLicenseRequiredMessage();
            return false;
        }

        const validation = await this.licenseValidator.validateLicense(licenseKey);
        
        if (!validation.valid || !validation.active) {
            await this.showLicenseInvalidMessage(validation.error);
            return false;
        }

        // Check for expiration warning
        if (validation.daysRemaining && validation.daysRemaining <= 7) {
            this.showExpirationWarning(validation.daysRemaining);
        }

        return true;
    }

    /**
     * Execute a command only if license is valid
     */
    static async executeProtectedCommand(
        context: vscode.ExtensionContext, 
        command: () => Promise<void> | void,
        featureName?: string
    ): Promise<void> {
        if (await this.checkLicense(context)) {
            try {
                await command();
            } catch (error) {
                console.error(`Error executing protected command ${featureName}:`, error);
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    }

    /**
     * Check license and return validation result for conditional features
     */
    static async getLicenseStatus(context: vscode.ExtensionContext) {
        const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
        
        if (!licenseKey) {
            return { hasLicense: false, valid: false, daysRemaining: 0 };
        }

        const validation = await this.licenseValidator.validateLicense(licenseKey);
        
        return {
            hasLicense: true,
            valid: validation.valid && validation.active,
            daysRemaining: validation.daysRemaining || 0,
            expiresAt: validation.expiresAt
        };
    }

    private static async showLicenseRequiredMessage(): Promise<void> {
        const action = await vscode.window.showWarningMessage(
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
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode'));
                break;
            case 'Learn More':
                vscode.env.openExternal(vscode.Uri.parse('https://docs.codecontextpro.com/vscode'));
                break;
        }
    }

    private static async showLicenseInvalidMessage(error?: string): Promise<void> {
        const message = error || 'License expired or invalid';
        
        const action = await vscode.window.showErrorMessage(
            `❌ ${message}. Please renew your license.`,
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

    private static showExpirationWarning(daysRemaining: number): void {
        const message = daysRemaining === 1 ? 
            '⚠️ Your license expires tomorrow!' :
            `⚠️ Your license expires in ${daysRemaining} days.`;

        vscode.window.showWarningMessage(
            message,
            'Renew Now'
        ).then(action => {
            if (action === 'Renew Now') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/renew'));
            }
        });
    }

    /**
     * Special method for trial users - shows upgrade prompt
     */
    static async showUpgradePrompt(feature: string): Promise<void> {
        const action = await vscode.window.showInformationMessage(
            `🚀 ${feature} is a Pro feature. Upgrade to access unlimited AI coding with persistent memory.`,
            { modal: true },
            'Upgrade Now',
            'Learn More',
            'Maybe Later'
        );

        switch (action) {
            case 'Upgrade Now':
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode?ref=upgrade'));
                break;
            case 'Learn More':
                vscode.env.openExternal(vscode.Uri.parse('https://docs.codecontextpro.com/features'));
                break;
        }
    }
}

export default FeatureGuard;