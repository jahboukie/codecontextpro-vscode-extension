# 🧠 CodeContext Pro - VS Code Extension

**AI Assistant with Persistent Memory for VS Code**

Transform your VS Code into an AI-powered development environment with persistent memory, code execution, and seamless Claude/GPT integration.

---

## 🚀 Features

### 🤖 **AI Chat Integration**
- **Claude & GPT Support**: Switch between Anthropic Claude and OpenAI GPT
- **Persistent Conversations**: Chat history maintained across VS Code sessions
- **Context Awareness**: AI understands your project structure and recent changes
- **Smart Suggestions**: Code completions and architectural advice

### 🧠 **Persistent Memory System**
- **Project Memory**: Remembers decisions, patterns, and conversations
- **Code Context**: Tracks file changes and development history  
- **Team Memory**: Share knowledge across team members (Pro feature)
- **Search & Recall**: Find previous solutions and discussions instantly

### 🚀 **Code Execution**
- **Sandbox Environments**: 16 isolated execution environments
- **Multi-Language**: JavaScript, TypeScript, Python, and more
- **Safe Testing**: Test code before deployment with confidence scoring
- **Result Integration**: Execution results displayed in VS Code panels

### 🔑 **License System**
- **7-Day Free Trial**: Full features for new users
- **Secure Validation**: License keys stored securely in VS Code
- **Offline Support**: 30-day offline operation capability
- **Flexible Licensing**: Monthly and annual subscription options

---

## 📦 Installation

### From VS Code Marketplace
```bash
# Search for "CodeContext Pro" in VS Code Extensions
# Or install via command line:
code --install-extension codecontextpro.codecontext-pro
```

### Manual Installation
```bash
# Download the .vsix file and install manually:
code --install-extension codecontext-pro-1.0.0.vsix
```

---

## ⚙️ Setup

### 1. **Get Your License Key**
- Visit [codecontextpro.com/vscode](https://codecontextpro.com/vscode)
- Start with a 7-day free trial
- Enter license key when prompted

### 2. **Configure AI Providers**
```bash
# Open Command Palette (Ctrl+Shift+P)
# Run: "CodeContext: Setup AI Providers"
```

**Required API Keys:**
- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)

### 3. **Start Using**
- Press `Ctrl+Shift+C` to open AI Chat
- Press `Ctrl+Shift+R` to execute selected code
- View memory in the bottom panel

---

## 🎮 Usage

### **AI Chat Commands**
| Command | Shortcut | Description |
|---------|----------|-------------|
| Open AI Chat | `Ctrl+Shift+C` | Start conversation with AI |
| Execute Code | `Ctrl+Shift+R` | Run selected code in sandbox |
| Show Memory | - | View conversation history |
| Setup Providers | - | Configure API keys |

### **Context Menu Integration**
- **Right-click in editor**: Quick access to AI chat and code execution
- **Explorer context**: Analyze files and folders with AI
- **Selection-based**: Execute or discuss selected code

### **Sidebar Panels**
- **AI Chat**: Main conversation interface with Claude/GPT
- **Memory Tree**: Browse conversation history and decisions
- **Execution Results**: View code execution outputs and logs

---

## 🛠️ Development

### **Prerequisites**
- Node.js 18+
- VS Code 1.95.0+
- TypeScript 4.9+

### **Build from Source**
```bash
# Clone the repository
git clone https://github.com/jahboukie/codecontextpro-vscode-extension.git
cd codecontextpro-vscode-extension

# Install dependencies
cd codecontext-core
npm install

# Compile TypeScript
npm run compile

# Package extension
npx vsce package

# Install locally for testing
code --install-extension codecontext-pro-1.0.0.vsix
```

### **Development Workflow**
```bash
# Watch mode for development
npm run watch

# Launch extension development host
code --extensionDevelopmentPath="$(pwd)" --new-window

# Run tests
npm test
```

---

## 📋 Architecture

### **Core Components**
```
codecontext-core/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── chatProvider.ts           # AI chat interface  
│   ├── memoryProvider.ts         # Memory tree view
│   ├── executionProvider.ts      # Code execution panel
│   └── services/
│       ├── aiProviderManager.ts  # Claude/GPT integration
│       ├── memoryEngine.ts       # Persistent memory
│       ├── licenseValidator.ts   # License validation
│       └── executionEngine.ts    # Code execution sandbox
├── package.json                  # Extension manifest
└── tsconfig.json                 # TypeScript configuration
```

### **Key Features**
- **TypeScript**: Full type safety and modern ES features
- **VS Code API**: Deep integration with editor and workbench
- **Secure Storage**: License keys and settings in VS Code global state
- **Memory Persistence**: SQLite database for conversation history
- **Sandbox Execution**: Isolated environments for safe code testing

---

## 🔑 License System

### **License Key Format**
```
CC_VSC_[32-character-hex]_[expiry-timestamp]
Example: CC_VSC_7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c_1704067200
```

### **Validation Flow**
1. **Format Check**: Validates license key structure
2. **Expiration Check**: Verifies license is still active  
3. **Online Validation**: Confirms with license server (when online)
4. **Grace Period**: 3-day grace for expired licenses
5. **Trial Support**: 7-day trial for new users

### **Commands**
| Command | Description |
|---------|-------------|
| `codecontext.enterLicense` | Enter or update license key |
| `codecontext.checkLicense` | Check current license status |
| `codecontext.purchaseLicense` | Purchase new license |
| `codecontext.renewLicense` | Renew existing license |

---

## 🔒 Security & Privacy

### **Data Protection**
- **Local Storage**: All data stored locally in VS Code
- **No Code Transmission**: Your code never leaves your machine (except to chosen AI providers)
- **Encrypted Keys**: API keys stored securely in VS Code global state
- **Privacy-First**: Optional usage analytics with no personal data

### **AI Provider Security**
- **Direct API Calls**: Extension connects directly to Anthropic/OpenAI
- **No Intermediary**: No third-party servers process your code
- **Key Management**: You control and provide your own API keys
- **Audit Trail**: All AI interactions logged locally

---

## 🚀 Roadmap

### **Phase 1: Core Features** ✅
- [x] AI chat integration with Claude and GPT
- [x] Persistent memory system  
- [x] Code execution in sandbox environments
- [x] License validation and trial system
- [x] VS Code UI integration

### **Phase 2: Advanced Features** 🚧
- [ ] Team memory sharing and collaboration
- [ ] Advanced code analysis and suggestions
- [ ] Custom AI model integration
- [ ] Plugin system for extensibility

### **Phase 3: Enterprise Features** 📋
- [ ] Enterprise license management
- [ ] SSO integration and team controls
- [ ] Advanced analytics and reporting
- [ ] Custom deployment options

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive message: `git commit -m 'Add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

### **Code Standards**
- TypeScript with strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive tests for new features
- Security-first development practices

---

## 📞 Support

### **Documentation**
- **Memory Instructions**: [VSCODE_EXTENSION_MEMORY_INSTRUCTIONS.md](VSCODE_EXTENSION_MEMORY_INSTRUCTIONS.md)
- **License Guide**: [LICENSING_GUIDE.md](codecontext-core/LICENSING_GUIDE.md)
- **API Documentation**: [docs.codecontextpro.com](https://docs.codecontextpro.com)

### **Get Help**
- **Issues**: [GitHub Issues](https://github.com/jahboukie/codecontextpro-vscode-extension/issues)
- **Support**: [codecontextpro.com/support](https://codecontextpro.com/support)
- **Community**: [Discord Server](https://discord.gg/codecontextpro)

### **Diagnostic Commands**
```bash
# Copy diagnostic info for support
Command Palette > "CodeContext: Copy Diagnostics"

# Check license status
Command Palette > "CodeContext: Check License Status"

# Contact support with pre-filled info
Command Palette > "CodeContext: Contact Support"
```

---

## 📄 License

This project is licensed under the Commercial License. See [LICENSE](codecontext-core/LICENSE) for details.

**Free Trial**: 7-day free trial included with full features.
**Subscription**: Monthly and annual licensing available.

---

## 🌟 Why CodeContext Pro?

### **The Problem**
- AI assistants forget context between sessions ("goldfish memory")
- Code execution requires switching between tools  
- No persistent memory of decisions and patterns
- Complex setup and configuration

### **Our Solution**
- **Persistent Memory**: Never lose context or conversations
- **Integrated Execution**: Test code directly in VS Code
- **Seamless AI**: Claude and GPT integration with one setup
- **Production Ready**: License system and enterprise features

### **Perfect For**
- **Individual Developers**: Boost productivity with AI memory
- **Development Teams**: Share knowledge and maintain context
- **Code Reviews**: AI-assisted code analysis and suggestions
- **Learning**: Persistent conversations about code and concepts

---

**Transform your VS Code into an AI-powered development environment with memory that never forgets! 🧠💻**

[![Install Extension](https://img.shields.io/badge/VS%20Code-Install%20Extension-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=codecontextpro.codecontext-pro)
[![License](https://img.shields.io/badge/License-Commercial-red)](LICENSE)
[![Support](https://img.shields.io/badge/Support-codecontextpro.com-green)](https://codecontextpro.com/support)