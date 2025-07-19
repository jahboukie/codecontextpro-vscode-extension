# 🔑 CodeContext Pro - Licensing Integration Guide

## 🎯 **License Key System Overview**

This VS Code extension requires a valid license key to function. The licensing system ensures sustainable development while providing unlimited use for licensed users.

---

## 📋 **License Key Format**

```
CC_VSC_[32-character-hex-string]_[expiry-timestamp]
```

**Example:**
```
CC_VSC_7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c_1704067200
```

**Components:**
- `CC_VSC_` - Product identifier
- `32-char hex` - Unique license identifier  
- `expiry timestamp` - Unix timestamp for expiration

---

## 🔧 **Implementation Steps**

### **1. License Validation Service**

```typescript
// src/services/licenseValidator.ts
export class LicenseValidator {
  private static instance: LicenseValidator;
  private licenseKey: string | null = null;
  private validationCache: Map<string, boolean> = new Map();
  
  async validateLicense(key: string): Promise<boolean> {
    // Validate format
    if (!this.validateFormat(key)) return false;
    
    // Check expiration
    if (!this.checkExpiration(key)) return false;
    
    // Verify with API (optional online validation)
    return await this.verifyWithAPI(key);
  }
  
  private validateFormat(key: string): boolean {
    return /^CC_VSC_[0-9a-f]{32}_\d{10}$/.test(key);
  }
  
  private checkExpiration(key: string): boolean {
    const parts = key.split('_');
    const expiry = parseInt(parts[3]);
    return Date.now() / 1000 < expiry;
  }
  
  private async verifyWithAPI(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.codecontextpro.com/validate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, product: 'vscode' })
      });
      
      const result = await response.json();
      return result.valid && result.active;
    } catch (error) {
      // Graceful degradation - allow offline use for existing users
      return this.validationCache.get(key) || false;
    }
  }
}
```

### **2. Extension Activation Guard**

```typescript
// src/extension.ts
import { LicenseValidator } from './services/licenseValidator';

export async function activate(context: vscode.ExtensionContext) {
  const licenseValidator = new LicenseValidator();
  
  // Check for existing license
  const storedLicense = context.globalState.get<string>('codecontext.licenseKey');
  
  if (!storedLicense || !(await licenseValidator.validateLicense(storedLicense))) {
    // Show license prompt
    await promptForLicense(context, licenseValidator);
    return; // Don't activate features until licensed
  }
  
  // License valid - activate all features
  await activateFeatures(context);
}

async function promptForLicense(context: vscode.ExtensionContext, validator: LicenseValidator) {
  const action = await vscode.window.showInformationMessage(
    '🔑 CodeContext Pro requires a license key to function.',
    'Enter License Key',
    'Purchase License',
    'Learn More'
  );
  
  switch (action) {
    case 'Enter License Key':
      await enterLicenseKey(context, validator);
      break;
    case 'Purchase License':
      vscode.env.openExternal(vscode.Uri.parse('https://codecontextpro.com/vscode'));
      break;
    case 'Learn More':
      vscode.env.openExternal(vscode.Uri.parse('https://docs.codecontextpro.com/vscode'));
      break;
  }
}

async function enterLicenseKey(context: vscode.ExtensionContext, validator: LicenseValidator) {
  const licenseKey = await vscode.window.showInputBox({
    prompt: 'Enter your CodeContext Pro license key',
    placeholder: 'CC_VSC_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxx',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || value.length < 10) return 'Please enter a valid license key';
      if (!value.startsWith('CC_VSC_')) return 'Invalid license key format';
      return null;
    }
  });
  
  if (licenseKey && await validator.validateLicense(licenseKey)) {
    await context.globalState.update('codecontext.licenseKey', licenseKey);
    vscode.window.showInformationMessage('✅ License activated successfully!');
    
    // Restart extension to activate features
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  } else {
    vscode.window.showErrorMessage('❌ Invalid license key. Please check and try again.');
  }
}
```

### **3. Feature Protection**

```typescript
// src/services/featureGuard.ts
export class FeatureGuard {
  private static licenseValidator = new LicenseValidator();
  
  static async checkLicense(context: vscode.ExtensionContext): Promise<boolean> {
    const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
    
    if (!licenseKey) {
      vscode.window.showWarningMessage('🔑 License required for this feature.');
      return false;
    }
    
    const isValid = await this.licenseValidator.validateLicense(licenseKey);
    
    if (!isValid) {
      vscode.window.showErrorMessage('❌ License expired or invalid. Please renew.');
      return false;
    }
    
    return true;
  }
}

// Protect all commands
async function executeProtectedCommand(context: vscode.ExtensionContext, command: () => void) {
  if (await FeatureGuard.checkLicense(context)) {
    command();
  }
}
```

---

## 🛒 **Purchase Flow Integration**

### **1. License Purchase API**

```bash
# Purchase endpoint
POST https://api.codecontextpro.com/purchase/vscode-license

{
  "email": "user@example.com",
  "plan": "monthly", // or "annual"
  "payment_method": "stripe_payment_method_id"
}

# Response
{
  "success": true,
  "license_key": "CC_VSC_7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c_1704067200",
  "expires_at": "2024-01-01T00:00:00Z",
  "receipt_url": "https://receipt.stripe.com/..."
}
```

### **2. Trial Period Handling**

```typescript
// 7-day trial for new users
export class TrialManager {
  private static TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  static async checkTrialStatus(context: vscode.ExtensionContext): Promise<{isTrialActive: boolean, daysLeft: number}> {
    const firstInstall = context.globalState.get<number>('codecontext.firstInstall');
    
    if (!firstInstall) {
      // First time install - start trial
      await context.globalState.update('codecontext.firstInstall', Date.now());
      return { isTrialActive: true, daysLeft: 7 };
    }
    
    const trialEnd = firstInstall + this.TRIAL_DURATION;
    const now = Date.now();
    
    if (now < trialEnd) {
      const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
      return { isTrialActive: true, daysLeft };
    }
    
    return { isTrialActive: false, daysLeft: 0 };
  }
}
```

---

## 🔒 **Security Measures**

### **1. License Storage**
- Stored in VS Code's global state (encrypted)
- Never transmitted to third parties
- Cached validation results for offline use

### **2. Validation Frequency**
- Check on extension activation
- Periodic validation (daily)
- Before expensive operations (AI calls)

### **3. Grace Periods**
- 3-day grace period for expired licenses
- 7-day trial for new users
- Offline operation for up to 30 days

---

## 📊 **Usage Analytics (Privacy-First)**

```typescript
// Track usage for license validation only
export class UsageTracker {
  static async trackUsage(feature: string) {
    // Only track feature usage, no code content
    const usage = {
      feature,
      timestamp: Date.now(),
      session_id: this.getSessionId() // Anonymous
    };
    
    // Store locally, sync periodically
    await this.storeUsage(usage);
  }
  
  // No personal data, no code content, just feature usage
}
```

---

## 🚀 **Commands for License Management**

### **Register Commands**

```typescript
// package.json additions
"commands": [
  {
    "command": "codecontext.enterLicense",
    "title": "🔑 Enter License Key",
    "category": "CodeContext"
  },
  {
    "command": "codecontext.checkLicense", 
    "title": "🔍 Check License Status",
    "category": "CodeContext"
  },
  {
    "command": "codecontext.purchaseLicense",
    "title": "💳 Purchase License",
    "category": "CodeContext"
  },
  {
    "command": "codecontext.renewLicense",
    "title": "🔄 Renew License",
    "category": "CodeContext"
  }
]
```

---

## 📞 **Customer Support Integration**

### **Support Commands**
```typescript
vscode.commands.registerCommand('codecontext.contactSupport', () => {
  const licenseKey = context.globalState.get<string>('codecontext.licenseKey');
  const supportUrl = `https://codecontextpro.com/support?license=${licenseKey?.slice(0, 10)}...`;
  vscode.env.openExternal(vscode.Uri.parse(supportUrl));
});
```

### **Diagnostic Information**
```typescript
vscode.commands.registerCommand('codecontext.diagnostics', async () => {
  const diagnostics = {
    version: context.extension?.packageJSON.version,
    license_status: await this.getLicenseStatus(),
    trial_info: await TrialManager.checkTrialStatus(context),
    installation_date: context.globalState.get('codecontext.firstInstall'),
    last_validation: context.globalState.get('codecontext.lastValidation')
  };
  
  // Copy to clipboard for support
  await vscode.env.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
  vscode.window.showInformationMessage('Diagnostic info copied to clipboard');
});
```

---

## 🎯 **Implementation Checklist**

### **Required Files:**
- [ ] `src/services/licenseValidator.ts` - Core validation logic
- [ ] `src/services/featureGuard.ts` - Feature protection  
- [ ] `src/services/trialManager.ts` - Trial period handling
- [ ] `src/commands/license.ts` - License management commands
- [ ] `package.json` - Updated with license commands

### **Required API Endpoints:**
- [ ] `POST /validate-license` - License validation
- [ ] `POST /purchase/vscode-license` - Purchase flow
- [ ] `GET /license-status/{key}` - Status checking
- [ ] `POST /license-renewal` - Renewal process

### **Testing Scenarios:**
- [ ] Fresh install (trial activation)
- [ ] Valid license entry
- [ ] Invalid license handling
- [ ] Expired license behavior
- [ ] Offline operation
- [ ] Feature protection
- [ ] Purchase flow integration

---

## 💰 **Revenue Integration**

### **Stripe Integration**
```bash
# Environment variables needed
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product IDs
VSCODE_MONTHLY_PRICE_ID=price_monthly_vscode
VSCODE_ANNUAL_PRICE_ID=price_annual_vscode
```

### **License Generation**
```javascript
// Generate license key after payment
function generateLicenseKey(customerId, planType) {
  const identifier = crypto.randomBytes(16).toString('hex');
  const expiry = Math.floor(Date.now() / 1000) + (planType === 'annual' ? 31536000 : 2592000);
  
  return `CC_VSC_${identifier}_${expiry}`;
}
```

---

**This licensing system ensures:**
- ✅ Sustainable revenue for development
- ✅ Fair pricing for unlimited use
- ✅ Secure license validation
- ✅ Great user experience
- ✅ Support for trials and renewals