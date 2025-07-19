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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// API Configuration
const API_BASE_URL = 'https://us-central1-context-code-pro.cloudfunctions.net/api/api';
const CONFIG_DIR = path.join(os.homedir(), '.codecontext-pro');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');
class ApiClient {
    constructor() {
        this.credentials = null;
        this.client = axios_1.default.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Load credentials on initialization
        this.loadCredentials();
        // Add request interceptor to include API key
        this.client.interceptors.request.use((config) => {
            if (this.credentials?.apiKey) {
                config.headers.Authorization = `Bearer ${this.credentials.apiKey}`;
            }
            return config;
        });
    }
    // Load credentials from local file
    loadCredentials() {
        try {
            if (fs.existsSync(CREDENTIALS_FILE)) {
                const credentialsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
                this.credentials = JSON.parse(credentialsData);
            }
        }
        catch (error) {
            console.warn('Warning: Could not load credentials');
            this.credentials = null;
        }
    }
    // Save credentials to local file
    saveCredentials(credentials) {
        try {
            // Ensure config directory exists
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true });
            }
            // Save credentials securely
            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
                mode: 0o600, // Read/write for owner only
            });
            this.credentials = credentials;
        }
        catch (error) {
            throw new Error(`Failed to save credentials: ${error.message}`);
        }
    }
    // Check if user is authenticated
    isAuthenticated() {
        return this.credentials !== null && this.credentials.apiKey !== undefined;
    }
    // Get current credentials
    getCredentials() {
        return this.credentials;
    }
    // Login with API key
    async login(apiKey) {
        try {
            // Temporarily set API key for this request
            const response = await this.client.get('/v1/users/me', {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            const userInfo = response.data;
            // Save credentials
            const credentials = {
                apiKey,
                userId: userInfo.uid,
                email: userInfo.email,
            };
            this.saveCredentials(credentials);
            return userInfo;
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Invalid API key. Please check your credentials.');
            }
            throw new Error(`Login failed: ${error.message}`);
        }
    }
    // Logout (remove credentials)
    logout() {
        try {
            if (fs.existsSync(CREDENTIALS_FILE)) {
                fs.unlinkSync(CREDENTIALS_FILE);
            }
            this.credentials = null;
        }
        catch (error) {
            console.warn('Warning: Could not remove credentials file');
        }
    }
    // Get current user info
    async getUserInfo() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated. Please run "codecontext login" first.');
        }
        try {
            const response = await this.client.get('/v1/users/me');
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Authentication expired. Please run "codecontext login" again.');
            }
            throw new Error(`Failed to get user info: ${error.message}`);
        }
    }
    // CRITICAL: Validate execution usage (UNGAMEABLE)
    async validateExecution() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated. Please run "codecontext login" first.');
        }
        try {
            const response = await this.client.post('/v1/executions/validate');
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Authentication expired. Please run "codecontext login" again.');
            }
            if (error.response?.status === 403) {
                throw new Error('Subscription required. Please activate your subscription to use executions.');
            }
            if (error.response?.status === 429) {
                const errorData = error.response.data;
                throw new Error(`Usage limit exceeded: ${errorData.message}\n` +
                    `Reset date: ${new Date(errorData.resetDate).toLocaleDateString()}`);
            }
            throw new Error(`Execution validation failed: ${error.message}`);
        }
    }
    // Create user account (called after web signup)
    async createUser(uid, email, displayName) {
        try {
            const response = await this.client.post('/v1/users/create', {
                uid,
                email,
                displayName,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }
}
// Export singleton instance
exports.apiClient = new ApiClient();
exports.default = exports.apiClient;
//# sourceMappingURL=apiClient.js.map