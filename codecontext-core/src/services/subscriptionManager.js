"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class SubscriptionManager {
    constructor(projectPath) {
        this.subscription = null;
        this.configPath = path.join(projectPath, '.codecontext', 'subscription.json');
    }
    async initialize() {
        await this.loadSubscription();
        // If no subscription exists, create free tier
        if (!this.subscription) {
            await this.createFreeSubscription();
        }
        // Check if monthly usage needs reset
        await this.checkAndResetMonthlyUsage();
    }
    async loadSubscription() {
        try {
            if (await fs.pathExists(this.configPath)) {
                this.subscription = await fs.readJson(this.configPath);
                return this.subscription;
            }
        }
        catch (error) {
            console.warn('Failed to load subscription:', error);
        }
        return null;
    }
    async saveSubscription() {
        if (this.subscription) {
            await fs.ensureDir(path.dirname(this.configPath));
            await fs.writeJson(this.configPath, this.subscription, { spaces: 2 });
        }
    }
    async createFreeSubscription() {
        // 🛠️ Developer Override: Check for developer environment
        const isDeveloper = process.env.CODECONTEXT_DEV === 'true' ||
            process.cwd().includes('code-context-pro') ||
            process.env.USER === 'developer';
        if (isDeveloper) {
            this.subscription = {
                status: 'active',
                tier: 'developer',
                userId: 'developer-unlimited',
                expiresAt: null,
                usage: {
                    executionsThisMonth: 0,
                    filesTracked: 0,
                    lastResetDate: new Date().toISOString(),
                    totalExecutions: 0
                },
                limits: {
                    maxExecutionsPerMonth: 999999,
                    maxFilesTracked: 999999,
                    advancedPatternRecognition: true,
                    unlimitedMemory: true
                }
            };
            await this.saveSubscription();
            console.log('🛠️ Developer mode activated! Unlimited superpowers enabled.');
            console.log('🧠 AI Assistant: Ready for world domination!');
            return;
        }
        this.subscription = {
            status: 'active',
            tier: 'free',
            userId: 'free-user',
            expiresAt: null,
            usage: {
                executionsThisMonth: 0,
                filesTracked: 0,
                lastResetDate: new Date().toISOString(),
                totalExecutions: 0
            },
            limits: {
                maxExecutionsPerMonth: 25,
                maxFilesTracked: 25,
                advancedPatternRecognition: false,
                unlimitedMemory: false
            }
        };
        await this.saveSubscription();
        console.log('🆓 Free tier activated! 25 executions/month to experience the transformation.');
        console.log('💎 Upgrade to Lifetime Pro for unlimited usage: codecontext-pro upgrade');
    }
    async createTrialSubscription() {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial
        this.subscription = {
            status: 'trial',
            tier: 'pro',
            userId: 'trial-user',
            expiresAt: trialEndDate.toISOString(),
            usage: {
                executionsThisMonth: 0,
                filesTracked: 0,
                lastResetDate: new Date().toISOString(),
                totalExecutions: 0
            },
            limits: {
                maxExecutionsPerMonth: 700,
                maxFilesTracked: 1000,
                advancedPatternRecognition: true,
                unlimitedMemory: true
            }
        };
        await this.saveSubscription();
        console.log('🎉 14-day trial started! Enjoy full CodeContext Pro features.');
    }
    async checkAndResetMonthlyUsage() {
        if (!this.subscription)
            return;
        const lastReset = new Date(this.subscription.usage.lastResetDate);
        const now = new Date();
        // Check if we're in a new month
        if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            this.subscription.usage.executionsThisMonth = 0;
            this.subscription.usage.lastResetDate = now.toISOString();
            await this.saveSubscription();
            console.log('📊 Monthly usage reset - you have 700 fresh executions!');
        }
    }
    async canExecute() {
        if (!this.subscription) {
            return { allowed: false, reason: 'No subscription found' };
        }
        // 🛠️ Developer Override: Always allow execution for developer tier
        if (this.subscription.tier === 'developer') {
            return { allowed: true };
        }
        // Check subscription status
        if (this.subscription.status === 'expired' || this.subscription.status === 'cancelled') {
            return { allowed: false, reason: 'Subscription expired. Please renew at codecontextpro.com' };
        }
        // Check trial expiration
        if (this.subscription.status === 'trial' && this.subscription.expiresAt) {
            const expiresAt = new Date(this.subscription.expiresAt);
            if (new Date() > expiresAt) {
                this.subscription.status = 'expired';
                await this.saveSubscription();
                return { allowed: false, reason: 'Trial expired. Upgrade to Pro at codecontextpro.com' };
            }
        }
        // Check execution limits and show upgrade prompts
        const usage = this.subscription.usage.executionsThisMonth;
        const limit = this.subscription.limits.maxExecutionsPerMonth;
        // Show upgrade prompt at 80% usage for free tier
        if (this.subscription.tier === 'free' && usage >= limit * 0.8 && usage < limit) {
            console.log(`🚨 Usage Warning: ${usage}/${limit} executions used`);
            console.log('💎 Upgrade to Lifetime Pro for unlimited usage!');
            console.log('🎯 Only limited lifetime spots remaining - codecontext-pro upgrade');
        }
        if (usage >= limit) {
            if (this.subscription.tier === 'free') {
                return {
                    allowed: false,
                    reason: `🆓 Free tier limit reached (${limit} executions). Upgrade to Lifetime Pro: codecontext-pro upgrade`
                };
            }
            else {
                return {
                    allowed: false,
                    reason: `Monthly execution limit reached (${limit}). Resets next month or upgrade at codecontextpro.com`
                };
            }
        }
        return { allowed: true };
    }
    async canTrackFile() {
        if (!this.subscription) {
            return { allowed: false, reason: 'No subscription found' };
        }
        if (this.subscription.usage.filesTracked >= this.subscription.limits.maxFilesTracked) {
            return {
                allowed: false,
                reason: `File tracking limit reached (${this.subscription.limits.maxFilesTracked}). Upgrade at codecontextpro.com`
            };
        }
        return { allowed: true };
    }
    async recordExecution() {
        if (!this.subscription)
            return;
        this.subscription.usage.executionsThisMonth++;
        this.subscription.usage.totalExecutions++;
        await this.saveSubscription();
    }
    async recordFileTracked() {
        if (!this.subscription)
            return;
        this.subscription.usage.filesTracked++;
        await this.saveSubscription();
    }
    getUsageStats() {
        return this.subscription?.usage || null;
    }
    getSubscriptionStatus() {
        return this.subscription;
    }
    async activatePaidSubscription(userId) {
        if (!this.subscription) {
            await this.createTrialSubscription();
        }
        if (this.subscription) {
            this.subscription.status = 'active';
            this.subscription.userId = userId;
            // Set expiration to one month from now
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            this.subscription.expiresAt = expiresAt.toISOString();
            await this.saveSubscription();
            console.log('🎉 CodeContext Pro activated! Welcome to unlimited AI memory.');
        }
    }
    getTrialDaysRemaining() {
        if (!this.subscription || this.subscription.status !== 'trial' || !this.subscription.expiresAt) {
            return 0;
        }
        const expiresAt = new Date(this.subscription.expiresAt);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    getUsageSummary() {
        if (!this.subscription) {
            return 'No subscription found';
        }
        const usage = this.subscription.usage;
        const limits = this.subscription.limits;
        const status = this.subscription.status;
        let summary = `📊 Usage Summary:\n`;
        summary += `   Status: ${status.toUpperCase()}`;
        if (status === 'trial') {
            summary += ` (${this.getTrialDaysRemaining()} days remaining)`;
        }
        summary += `\n   Executions: ${usage.executionsThisMonth}/${limits.maxExecutionsPerMonth} this month\n`;
        summary += `   Files Tracked: ${usage.filesTracked}/${limits.maxFilesTracked}\n`;
        summary += `   Total Executions: ${usage.totalExecutions}\n`;
        if (status === 'trial' || status === 'expired') {
            summary += `\n💎 Upgrade to Pro: codecontextpro.com`;
        }
        return summary;
    }
    async extendTrial(days) {
        if (!this.subscription || this.subscription.status !== 'trial' || !this.subscription.expiresAt) {
            return;
        }
        const currentExpiry = new Date(this.subscription.expiresAt);
        currentExpiry.setDate(currentExpiry.getDate() + days);
        this.subscription.expiresAt = currentExpiry.toISOString();
        await this.saveSubscription();
        console.log(`🎉 Trial extended by ${days} days!`);
    }
}
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=subscriptionManager.js.map