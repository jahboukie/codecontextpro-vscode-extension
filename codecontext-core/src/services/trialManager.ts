/**
 * Trial Manager - 7-day free trial with memory-only access
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface TrialStatus {
    isActive: boolean;
    daysRemaining: number;
    startDate: Date;
    endDate: Date;
    isExpired: boolean;
    canUseMemory: boolean;
    canUseExecution: boolean;
    canExportMemory: boolean;
    projectCount: number;
    maxProjects: number;
    subscriptionTier: 'trial' | 'individual' | 'team-small' | 'team-large' | 'expired';
}

export class TrialManager {
    private trialFile: string;
    
    constructor(private context: vscode.ExtensionContext) {
        this.trialFile = path.join(context.globalStorageUri.fsPath, 'trial.json');
    }

    async initializeTrial(): Promise<TrialStatus> {
        await fs.ensureDir(path.dirname(this.trialFile));
        
        if (await fs.pathExists(this.trialFile)) {
            return await this.getTrialStatus();
        }

        // First time user - start trial
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

        const trialData = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            projectCount: 0
        };

        await fs.writeJson(this.trialFile, trialData);
        
        // Show welcome message
        this.showTrialWelcome();
        
        return await this.getTrialStatus();
    }

    async getTrialStatus(): Promise<TrialStatus> {
        if (!(await fs.pathExists(this.trialFile))) {
            return await this.initializeTrial();
        }

        const trialData = await fs.readJson(this.trialFile);
        const startDate = new Date(trialData.startDate);
        const endDate = new Date(trialData.endDate);
        const now = new Date();

        const isExpired = now > endDate;
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        return {
            isActive: !isExpired,
            daysRemaining,
            startDate,
            endDate,
            isExpired,
            canUseMemory: true, // Always available in trial
            canUseExecution: false, // Pro feature only
            canExportMemory: false, // Teams feature only
            projectCount: trialData.projectCount || 0,
            maxProjects: 1, // Trial limited to 1 project
            subscriptionTier: isExpired ? 'expired' : 'trial'
        };
    }

    async canAccessProject(projectPath: string): Promise<boolean> {
        const status = await this.getTrialStatus();
        
        if (status.isExpired) {
            this.showUpgradePrompt('trial-expired');
            return false;
        }

        // Check if this is an existing project
        const trialData = await fs.readJson(this.trialFile);
        const currentProject = trialData.currentProject;

        if (!currentProject) {
            // First project - allow and set as current
            trialData.currentProject = projectPath;
            trialData.projectCount = 1;
            await fs.writeJson(this.trialFile, trialData);
            return true;
        }

        if (currentProject === projectPath) {
            // Same project - allow
            return true;
        }

        // Different project - trial allows only 1
        this.showUpgradePrompt('project-limit');
        return false;
    }

    async canUseExecution(): Promise<boolean> {
        const status = await this.getTrialStatus();
        
        if (!status.isActive) {
            this.showUpgradePrompt('trial-expired');
            return false;
        }

        // Execution is Pro-only
        this.showUpgradePrompt('execution-feature');
        return false;
    }

    async canExportMemory(): Promise<boolean> {
        const status = await this.getTrialStatus();
        
        if (!status.isActive) {
            this.showUpgradePrompt('trial-expired');
            return false;
        }

        // Memory export is Teams feature only
        this.showTeamsUpgradePrompt();
        return false;
    }

    private showTrialWelcome() {
        vscode.window.showInformationMessage(
            '🎉 Welcome to CodeContext Studio! You have a 7-day free trial with persistent memory. Experience AI that remembers everything!',
            '🧠 Try Memory', '💳 Upgrade Now'
        ).then(selection => {
            if (selection === '🧠 Try Memory') {
                vscode.commands.executeCommand('codecontext.openChat');
            } else if (selection === '💳 Upgrade Now') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/upgrade'));
            }
        });
    }

    private showTeamsUpgradePrompt() {
        const message = '👥 Memory Export/Import is a Teams feature!\n\n' +
            '🧠 Share memories across your team:\n' +
            '• Export project insights\n' +
            '• Import team knowledge\n' +
            '• Sync architectural decisions\n\n' +
            '💰 Teams Pricing:\n' +
            '• 2-25 seats: $99/month per developer\n' +
            '• 26-50 seats: $149/month per developer';

        vscode.window.showInformationMessage(
            message,
            '👥 Upgrade to Teams', '💳 Individual Pro ($59)', '⏰ Remind Later'
        ).then(selection => {
            if (selection === '👥 Upgrade to Teams') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/teams'));
            } else if (selection === '💳 Individual Pro ($59)') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/upgrade'));
            }
        });
    }

    private showUpgradePrompt(reason: 'trial-expired' | 'project-limit' | 'execution-feature') {
        let message = '';
        let ctaButton = '💳 Upgrade to Pro';

        switch (reason) {
            case 'trial-expired':
                message = '⏰ Your 7-day trial has expired. Upgrade to continue using CodeContext Studio with unlimited projects and code execution!';
                break;
            case 'project-limit':
                message = '📁 Trial limited to 1 project. Upgrade to Pro for unlimited projects and code execution features!';
                break;
            case 'execution-feature':
                message = '🚀 Code execution is a Pro feature. Upgrade to run code directly in your editor with secure sandbox!';
                break;
        }

        vscode.window.showWarningMessage(
            message,
            ctaButton, '⏰ Remind Later'
        ).then(selection => {
            if (selection === ctaButton) {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/upgrade'));
            }
        });
    }

    async showTrialStatus() {
        const status = await this.getTrialStatus();
        
        if (status.isExpired) {
            vscode.window.showErrorMessage(
                '⏰ Trial expired. Upgrade to Pro for unlimited access!',
                '💳 Upgrade Now'
            ).then(selection => {
                if (selection === '💳 Upgrade Now') {
                    vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/upgrade'));
                }
            });
            return;
        }

        const message = `🧠 CodeContext Studio Trial\n\n` +
            `⏰ ${status.daysRemaining} days remaining\n` +
            `📁 Project: ${status.projectCount}/${status.maxProjects}\n` +
            `🧠 Memory: ✅ Active (Blow your mind!)\n` +
            `🚀 Execution: 💳 Pro feature\n\n` +
            `Experience persistent memory - AI that remembers everything!`;

        vscode.window.showInformationMessage(
            message,
            '💳 Upgrade to Pro', '🧠 Try Memory'
        ).then(selection => {
            if (selection === '💳 Upgrade to Pro') {
                vscode.env.openExternal(vscode.Uri.parse('https://codecontextstudio.com/upgrade'));
            } else if (selection === '🧠 Try Memory') {
                vscode.commands.executeCommand('codecontext.openChat');
            }
        });
    }

    // Status bar integration
    async updateStatusBar() {
        const status = await this.getTrialStatus();
        
        if (status.isExpired) {
            vscode.window.setStatusBarMessage(
                '$(warning) CodeContext: Trial Expired - Upgrade to Pro',
                5000
            );
        } else {
            vscode.window.setStatusBarMessage(
                `$(robot) CodeContext: ${status.daysRemaining}d trial - Memory Active`,
                3000
            );
        }
    }
}