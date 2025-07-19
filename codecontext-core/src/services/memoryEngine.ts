import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

// Subscription and usage tracking interfaces
export interface SubscriptionInfo {
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  tier: 'free' | 'pro' | 'lifetime' | 'developer';
  userId: string;
  expiresAt: string | null;
  usage: UsageStats;
  limits: UsageLimits;
}

export interface UsageStats {
  executionsThisMonth: number;
  filesTracked: number;
  lastResetDate: string;
  totalExecutions: number;
}

export interface UsageLimits {
  maxExecutionsPerMonth: number;
  maxFilesTracked: number;
  advancedPatternRecognition: boolean;
  unlimitedMemory: boolean;
}

// Core interfaces for memory system
export interface ProjectMemory {
  id: string;
  name: string;
  rootPath: string;
  createdAt: Date;
  lastActive: Date;
  conversations: Conversation[];
  decisions: ArchitecturalDecision[];
  patterns: CodePattern[];
  preferences: UserPreferences;
  fileHistory: FileChangeHistory[];
  subscription?: SubscriptionInfo;
}

export interface Conversation {
  id: string;
  timestamp: Date;
  aiAssistant: string;
  context: ConversationContext;
  messages: Message[];
  outcomes: ConversationOutcome[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface ArchitecturalDecision {
  id: string;
  timestamp: Date;
  decision: string;
  rationale: string;
  alternatives: string[];
  impact: string[];
  filesAffected: string[];
}

export interface FileChangeHistory {
  id: string;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: Date;
  conversationId?: string;
}

export interface CodePattern {
  id: string;
  pattern: string;
  frequency: number;
  context: string;
}

export interface UserPreferences {
  codingStyle?: string;
  preferredPatterns?: string[];
  aiAssistantPreferences?: Record<string, any>;
}

export interface ConversationContext {
  activeFile?: string;
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
  openFiles?: string[];
}

export interface ConversationOutcome {
  type: 'code_generated' | 'decision_made' | 'problem_solved';
  description: string;
  filesModified?: string[];
}

export class MemoryEngine {
  private db: sqlite3.Database | null = null;
  private projectPath: string;
  private dbPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.dbPath = path.join(projectPath, '.codecontext', 'memory.db');
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(this.dbPath));

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        ai_assistant TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        context TEXT,
        summary TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS architectural_decisions (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        decision TEXT NOT NULL,
        rationale TEXT,
        alternatives TEXT,
        impact TEXT,
        files_affected TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS file_changes (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        conversation_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS code_patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        pattern TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        context TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }

    // Create initial project record
    const projectId = this.generateProjectId();
    const projectName = path.basename(this.projectPath);
    
    await this.runQuery(
      `INSERT OR REPLACE INTO projects (id, name, root_path) VALUES (?, ?, ?)`,
      [projectId, projectName, this.projectPath]
    );
  }

  protected runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  protected getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  protected allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async recordConversation(
    aiAssistant: string,
    messages: Message[],
    context?: ConversationContext
  ): Promise<string> {
    const conversationId = uuidv4();
    const projectId = this.generateProjectId();

    // Insert conversation
    await this.runQuery(
      `INSERT INTO conversations (id, project_id, ai_assistant, context) VALUES (?, ?, ?, ?)`,
      [conversationId, projectId, aiAssistant, JSON.stringify(context || {})]
    );

    // Insert messages
    for (const message of messages) {
      await this.runQuery(
        `INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)`,
        [message.id || uuidv4(), conversationId, message.role, message.content, JSON.stringify(message.metadata || {})]
      );
    }

    // Update project last active
    await this.updateProjectActivity();

    return conversationId;
  }

  async recordArchitecturalDecision(decision: Omit<ArchitecturalDecision, 'id' | 'timestamp'>): Promise<void> {
    const projectId = this.generateProjectId();
    const decisionId = uuidv4();

    await this.runQuery(
      `INSERT INTO architectural_decisions (id, project_id, decision, rationale, alternatives, impact, files_affected) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        decisionId,
        projectId,
        decision.decision,
        decision.rationale,
        JSON.stringify(decision.alternatives),
        JSON.stringify(decision.impact),
        JSON.stringify(decision.filesAffected)
      ]
    );

    await this.updateProjectActivity();
  }

  async trackFileChange(filePath: string, changeType: 'created' | 'modified' | 'deleted', conversationId?: string): Promise<void> {
    const projectId = this.generateProjectId();
    const changeId = uuidv4();

    await this.runQuery(
      `INSERT INTO file_changes (id, project_id, file_path, change_type, conversation_id) VALUES (?, ?, ?, ?, ?)`,
      [changeId, projectId, filePath, changeType, conversationId]
    );
  }

  async getProjectMemory(): Promise<ProjectMemory> {
    const projectId = this.generateProjectId();
    
    // Get project info
    const project = await this.getQuery(
      `SELECT * FROM projects WHERE id = ?`,
      [projectId]
    );

    // Get conversations with messages
    const conversations = await this.allQuery(
      `SELECT * FROM conversations WHERE project_id = ? ORDER BY timestamp DESC`,
      [projectId]
    );

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await this.allQuery(
          `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp`,
          [conv.id]
        );
        
        return {
          id: conv.id,
          timestamp: new Date(conv.timestamp),
          aiAssistant: conv.ai_assistant,
          context: JSON.parse(conv.context || '{}'),
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            metadata: JSON.parse(msg.metadata || '{}')
          })),
          outcomes: [] // TODO: Implement outcomes tracking
        };
      })
    );

    // Get decisions
    const decisions = await this.allQuery(
      `SELECT * FROM architectural_decisions WHERE project_id = ? ORDER BY timestamp DESC`,
      [projectId]
    );

    const parsedDecisions = decisions.map(decision => ({
      id: decision.id,
      timestamp: new Date(decision.timestamp),
      decision: decision.decision,
      rationale: decision.rationale,
      alternatives: JSON.parse(decision.alternatives || '[]'),
      impact: JSON.parse(decision.impact || '[]'),
      filesAffected: JSON.parse(decision.files_affected || '[]')
    }));

    // Get file history
    const fileHistory = await this.allQuery(
      `SELECT * FROM file_changes WHERE project_id = ? ORDER BY timestamp DESC LIMIT 100`,
      [projectId]
    );

    const parsedFileHistory = fileHistory.map(file => ({
      id: file.id,
      filePath: file.file_path,
      changeType: file.change_type,
      timestamp: new Date(file.timestamp),
      conversationId: file.conversation_id
    }));

    return {
      id: project.id,
      name: project.name,
      rootPath: project.root_path,
      createdAt: new Date(project.created_at),
      lastActive: new Date(project.last_active),
      conversations: conversationsWithMessages,
      decisions: parsedDecisions,
      patterns: [], // TODO: Implement pattern recognition
      preferences: {}, // TODO: Implement preferences
      fileHistory: parsedFileHistory
    };
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    const projectId = this.generateProjectId();
    
    const conversations = await this.allQuery(
      `SELECT DISTINCT c.* FROM conversations c 
       JOIN messages m ON c.id = m.conversation_id 
       WHERE c.project_id = ? AND (m.content LIKE ? OR c.summary LIKE ?)
       ORDER BY c.timestamp DESC`,
      [projectId, `%${query}%`, `%${query}%`]
    );

    return Promise.all(
      conversations.map(async (conv) => {
        const messages = await this.allQuery(
          `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp`,
          [conv.id]
        );
        
        return {
          id: conv.id,
          timestamp: new Date(conv.timestamp),
          aiAssistant: conv.ai_assistant,
          context: JSON.parse(conv.context || '{}'),
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            metadata: JSON.parse(msg.metadata || '{}')
          })),
          outcomes: []
        };
      })
    );
  }

  async getStatistics() {
    const projectId = this.generateProjectId();
    
    const conversationCount = await this.getQuery(
      `SELECT COUNT(*) as count FROM conversations WHERE project_id = ?`,
      [projectId]
    );
    
    const messageCount = await this.getQuery(
      `SELECT COUNT(*) as count FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE c.project_id = ?`,
      [projectId]
    );
    
    const decisionCount = await this.getQuery(
      `SELECT COUNT(*) as count FROM architectural_decisions WHERE project_id = ?`,
      [projectId]
    );
    
    const fileCount = await this.getQuery(
      `SELECT COUNT(DISTINCT file_path) as count FROM file_changes WHERE project_id = ?`,
      [projectId]
    );
    
    const lastActivity = await this.getQuery(
      `SELECT last_active FROM projects WHERE id = ?`,
      [projectId]
    );

    const dbStats = fs.statSync(this.dbPath);

    return {
      conversationCount: conversationCount.count,
      messageCount: messageCount.count,
      decisionCount: decisionCount.count,
      fileCount: fileCount.count,
      lastActivity: lastActivity?.last_active,
      databaseSize: `${(dbStats.size / 1024).toFixed(1)} KB`
    };
  }

  async performInitialScan(): Promise<void> {
    // Scan project structure and record initial state
    const files = await this.scanProjectFiles();
    
    for (const file of files) {
      await this.trackFileChange(file, 'created');
    }
  }

  async clearAllMemory(): Promise<void> {
    const projectId = this.generateProjectId();
    
    const tables = ['messages', 'conversations', 'architectural_decisions', 'file_changes', 'code_patterns', 'user_preferences'];
    
    for (const table of tables) {
      await this.runQuery(`DELETE FROM ${table} WHERE project_id = ?`, [projectId]);
    }
  }

  private async scanProjectFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h'];
    
    const scanDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);
        
        // Skip node_modules, .git, etc.
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(relativePath);
        }
      }
    };
    
    await scanDir(this.projectPath);
    return files;
  }

  private async updateProjectActivity(): Promise<void> {
    const projectId = this.generateProjectId();
    await this.runQuery(
      `UPDATE projects SET last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      [projectId]
    );
  }

  private generateProjectId(): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(this.projectPath).digest('hex').substring(0, 16);
  }

  // AI Provider Integration Methods
  async recall(message: string, projectId?: string): Promise<any[]> {
    const pid = projectId || this.generateProjectId();
    
    // Extract key terms for better search
    const searchTerms = this.extractSearchTerms(message);
    const memories: any[] = [];
    
    // Search recent conversations (broader search)
    const recentConversations = await this.allQuery(
      `SELECT c.*, m.content, m.role FROM conversations c 
       JOIN messages m ON c.id = m.conversation_id 
       WHERE c.project_id = ? 
       ORDER BY c.timestamp DESC LIMIT 20`,
      [pid]
    );

    // Add relevant recent conversations
    for (const conv of recentConversations) {
      memories.push({
        type: 'conversation',
        content: `${conv.role}: ${conv.content}`,
        timestamp: conv.timestamp,
        aiAssistant: conv.ai_assistant
      });
    }

    // Search for architectural decisions with multiple term matching
    for (const term of searchTerms) {
      const decisions = await this.allQuery(
        `SELECT * FROM architectural_decisions 
         WHERE project_id = ? AND (decision LIKE ? OR rationale LIKE ?)
         ORDER BY timestamp DESC LIMIT 5`,
        [pid, `%${term}%`, `%${term}%`]
      );

      for (const decision of decisions) {
        memories.push({
          type: 'decision',
          content: decision.decision,
          rationale: decision.rationale,
          timestamp: decision.timestamp
        });
      }
    }

    // Search code patterns
    for (const term of searchTerms) {
      const patterns = await this.allQuery(
        `SELECT * FROM code_patterns 
         WHERE project_id = ? AND (pattern LIKE ? OR context LIKE ?)
         ORDER BY frequency DESC LIMIT 5`,
        [pid, `%${term}%`, `%${term}%`]
      );

      for (const pattern of patterns) {
        memories.push({
          type: 'pattern',
          content: pattern.pattern,
          context: pattern.context,
          frequency: pattern.frequency
        });
      }
    }

    // Remove duplicates and return most relevant
    const uniqueMemories = this.deduplicateMemories(memories);
    return uniqueMemories.slice(0, 15); // Limit to top 15 most relevant
  }

  protected extractSearchTerms(message: string): string[] {
    // Extract meaningful terms for search
    const terms = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'for', 'are', 'you', 'can', 'how', 'what', 'why', 'when', 'where'].includes(term));
    
    return [...new Set(terms)]; // Remove duplicates
  }

  protected deduplicateMemories(memories: any[]): any[] {
    const seen = new Set();
    return memories.filter(memory => {
      const key = `${memory.type}:${memory.content?.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async storeCodePattern(pattern: {
    pattern: string;
    language: string;
    context: string;
    success: boolean;
    projectId?: string;
  }): Promise<void> {
    const pid = pattern.projectId || this.generateProjectId();
    const patternId = uuidv4();

    await this.runQuery(
      `INSERT INTO code_patterns (id, project_id, pattern, context, frequency) VALUES (?, ?, ?, ?, ?)`,
      [patternId, pid, pattern.pattern, JSON.stringify({
        language: pattern.language,
        context: pattern.context,
        success: pattern.success
      }), 1]
    );
  }

  async storeConversation(conversation: {
    message: string;
    response: string;
    projectId?: string;
    aiProvider?: string;
    timestamp: Date;
  }): Promise<void> {
    const pid = conversation.projectId || this.generateProjectId();
    
    const messages = [
      {
        id: uuidv4(),
        role: 'user' as const,
        content: conversation.message,
        timestamp: conversation.timestamp
      },
      {
        id: uuidv4(),
        role: 'assistant' as const,
        content: conversation.response,
        timestamp: conversation.timestamp
      }
    ];

    await this.recordConversation(
      conversation.aiProvider || 'unknown',
      messages
    );
  }

  // Additional methods for VS Code integration
  async getRecentConversations(limit: number = 10): Promise<any[]> {
    const projectId = this.generateProjectId();
    
    const conversations = await this.allQuery(
      `SELECT c.*, m.content, m.role FROM conversations c 
       LEFT JOIN messages m ON c.id = m.conversation_id 
       WHERE c.project_id = ? 
       ORDER BY c.timestamp DESC LIMIT ?`,
      [projectId, limit]
    );

    return conversations.map((conv: any) => ({
      message: conv.content || 'No message',
      aiProvider: conv.ai_assistant || 'unknown',
      timestamp: new Date(conv.timestamp)
    }));
  }

  async getSuccessfulPatterns(limit: number = 10): Promise<any[]> {
    const projectId = this.generateProjectId();
    
    const patterns = await this.allQuery(
      `SELECT * FROM code_patterns 
       WHERE project_id = ?
       ORDER BY frequency DESC LIMIT ?`,
      [projectId, limit]
    );

    return patterns.map((pattern: any) => {
      const context = JSON.parse(pattern.context || '{}');
      return {
        language: context.language || 'unknown',
        context: context.context || 'No context',
        pattern: pattern.pattern || 'No pattern'
      };
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
