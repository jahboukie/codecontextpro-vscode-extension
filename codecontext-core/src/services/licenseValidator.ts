/**
 * CodeContext Pro - License Validation Service
 * Ensures extension cannot be used without valid license key
 */

import * as vscode from 'vscode';

export interface LicenseValidationResult {
    valid: boolean;
    active: boolean;
    expiresAt?: Date;
    daysRemaining?: number;
    error?: string;
}

export class LicenseValidator {
    private static instance: LicenseValidator;
    private validationCache: Map<string, LicenseValidationResult> = new Map();
    private lastValidation: number = 0;
    private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly API_ENDPOINT = 'https://api.codecontextpro.com/validate-license';

    public static getInstance(): LicenseValidator {
        if (!LicenseValidator.instance) {
            LicenseValidator.instance = new LicenseValidator();
        }
        return LicenseValidator.instance;
    }

    async validateLicense(key: string): Promise<LicenseValidationResult> {
        try {
            // Validate format first
            if (!this.validateFormat(key)) {
                return { valid: false, active: false, error: 'Invalid license key format' };
            }

            // Check expiration
            if (!this.checkExpiration(key)) {
                return { valid: false, active: false, error: 'License key has expired' };
            }

            // Check cache for recent validation
            const cached = this.validationCache.get(key);
            if (cached && (Date.now() - this.lastValidation) < this.VALIDATION_INTERVAL) {
                return cached;
            }

            // Verify with API (online validation)
            const apiResult = await this.verifyWithAPI(key);
            
            // Cache the result
            this.validationCache.set(key, apiResult);
            this.lastValidation = Date.now();

            return apiResult;

        } catch (error) {
            console.error('License validation error:', error);
            
            // Graceful degradation - check cache for offline use
            const cached = this.validationCache.get(key);
            if (cached && cached.valid) {
                // Allow offline use for up to 30 days
                const daysSinceLastValidation = (Date.now() - this.lastValidation) / (1000 * 60 * 60 * 24);
                if (daysSinceLastValidation <= 30) {
                    return cached;
                }
            }

            return { valid: false, active: false, error: 'Unable to validate license - check connection' };
        }
    }

    private validateFormat(key: string): boolean {
        // CC_VSC_[32-char-hex]_[timestamp]
        return /^CC_VSC_[0-9a-f]{32}_\d{10}$/.test(key);
    }

    private checkExpiration(key: string): boolean {
        const parts = key.split('_');
        if (parts.length !== 4) return false;
        
        const expiry = parseInt(parts[3]);
        const now = Math.floor(Date.now() / 1000);
        
        return now < expiry;
    }

    private async verifyWithAPI(key: string): Promise<LicenseValidationResult> {
        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'CodeContext-Pro-VSCode/1.0.0'
                },
                body: JSON.stringify({ 
                    licenseKey: key, 
                    product: 'vscode',
                    version: '1.0.0'
                }),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.valid && result.active) {
                const expiresAt = result.expires_at ? new Date(result.expires_at) : undefined;
                const daysRemaining = expiresAt ? 
                    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;

                return {
                    valid: true,
                    active: true,
                    expiresAt,
                    daysRemaining
                };
            } else {
                return {
                    valid: false,
                    active: false,
                    error: result.message || 'License is not valid or active'
                };
            }

        } catch (error) {
            console.error('API validation failed:', error);
            throw error;
        }
    }

    getDaysUntilExpiration(key: string): number {
        const parts = key.split('_');
        if (parts.length !== 4) return 0;
        
        const expiry = parseInt(parts[3]);
        const now = Math.floor(Date.now() / 1000);
        
        return Math.max(0, Math.ceil((expiry - now) / (60 * 60 * 24)));
    }

    clearCache(): void {
        this.validationCache.clear();
        this.lastValidation = 0;
    }
}

export default LicenseValidator;