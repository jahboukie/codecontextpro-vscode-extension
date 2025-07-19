"use strict";
/**
 * Team Memory Engine - Shared Intelligence System
 * The core that enables team superintelligence
 */
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
exports.TeamMemoryEngine = void 0;
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const memoryEngine_1 = require("./memoryEngine");
class TeamMemoryEngine extends memoryEngine_1.MemoryEngine {
    constructor(teamId, projectPath) {
        super(projectPath);
        this.teamId = teamId;
        this.teamDbPath = path.join(projectPath, '.codecontext', 'team-memory.db');
    }
    async initialize() {
        await super.initialize();
        await this.createTeamTables();
    }
    async createTeamTables() {
        const teamTables = [
            `CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        permissions TEXT NOT NULL,
        UNIQUE(team_id, email)
      )`,
            `CREATE TABLE IF NOT EXISTS team_memories (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        tags TEXT,
        visibility TEXT DEFAULT 'team_only',
        project_id TEXT,
        metadata TEXT,
        usage_count INTEGER DEFAULT 0,
        success_score REAL DEFAULT 0.0,
        FOREIGN KEY (team_id) REFERENCES teams (id),
        FOREIGN KEY (created_by) REFERENCES team_members (id)
      )`,
            `CREATE TABLE IF NOT EXISTS team_memory_votes (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        vote TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (memory_id) REFERENCES team_memories (id),
        FOREIGN KEY (member_id) REFERENCES team_members (id),
        UNIQUE(memory_id, member_id)
      )`,
            `CREATE TABLE IF NOT EXISTS team_memory_comments (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        parent_comment_id TEXT,
        FOREIGN KEY (memory_id) REFERENCES team_memories (id),
        FOREIGN KEY (member_id) REFERENCES team_members (id)
      )`,
            `CREATE TABLE IF NOT EXISTS team_projects (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        tech_stack TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        members TEXT,
        memory_count INTEGER DEFAULT 0,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id),
        FOREIGN KEY (created_by) REFERENCES team_members (id)
      )`,
            `CREATE TABLE IF NOT EXISTS team_memory_usage (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        used_by TEXT NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        context TEXT,
        success BOOLEAN DEFAULT 1,
        FOREIGN KEY (memory_id) REFERENCES team_memories (id),
        FOREIGN KEY (used_by) REFERENCES team_members (id)
      )`
        ];
        for (const table of teamTables) {
            await this.runQuery(table);
        }
    }
    /**
     * Team Member Management
     */
    async addTeamMember(member) {
        const memberId = (0, uuid_1.v4)();
        await this.runQuery(`INSERT INTO team_members (id, team_id, email, name, role, permissions) VALUES (?, ?, ?, ?, ?, ?)`, [memberId, this.teamId, member.email, member.name, member.role, JSON.stringify(member.permissions)]);
        return memberId;
    }
    async getTeamMembers() {
        const members = await this.allQuery(`SELECT * FROM team_members WHERE team_id = ? ORDER BY joined_at`, [this.teamId]);
        return members.map(m => ({
            id: m.id,
            email: m.email,
            name: m.name,
            role: m.role,
            joinedAt: new Date(m.joined_at),
            lastActive: new Date(m.last_active),
            permissions: JSON.parse(m.permissions)
        }));
    }
    /**
     * Team Memory Management
     */
    async createTeamMemory(memory) {
        const memoryId = (0, uuid_1.v4)();
        await this.runQuery(`INSERT INTO team_memories (id, team_id, type, title, content, context, created_by, tags, visibility, project_id, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            memoryId,
            this.teamId,
            memory.type,
            memory.title,
            memory.content,
            memory.context,
            memory.createdBy,
            JSON.stringify(memory.tags),
            memory.visibility,
            memory.projectId,
            JSON.stringify(memory.metadata)
        ]);
        return memoryId;
    }
    async getTeamMemories(filter) {
        let query = `SELECT * FROM team_memories WHERE team_id = ?`;
        const params = [this.teamId];
        if (filter?.type) {
            query += ` AND type = ?`;
            params.push(filter.type);
        }
        if (filter?.createdBy) {
            query += ` AND created_by = ?`;
            params.push(filter.createdBy);
        }
        if (filter?.projectId) {
            query += ` AND project_id = ?`;
            params.push(filter.projectId);
        }
        if (filter?.visibility) {
            query += ` AND visibility = ?`;
            params.push(filter.visibility);
        }
        query += ` ORDER BY created_at DESC`;
        const memories = await this.allQuery(query, params);
        return Promise.all(memories.map(async (m) => ({
            id: m.id,
            type: m.type,
            title: m.title,
            content: m.content,
            context: m.context,
            createdBy: m.created_by,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
            tags: JSON.parse(m.tags || '[]'),
            visibility: m.visibility,
            projectId: m.project_id,
            metadata: JSON.parse(m.metadata || '{}'),
            votes: await this.getMemoryVotes(m.id),
            comments: await this.getMemoryComments(m.id),
            usageCount: m.usage_count,
            successScore: m.success_score
        })));
    }
    async searchTeamMemories(query, memberId) {
        const searchTerms = this.extractSearchTerms(query);
        const memories = [];
        for (const term of searchTerms) {
            const results = await this.allQuery(`SELECT * FROM team_memories 
         WHERE team_id = ? AND (title LIKE ? OR content LIKE ? OR context LIKE ?)
         AND (visibility = 'public' OR visibility = 'team_only' OR (visibility = 'private' AND created_by = ?))
         ORDER BY usage_count DESC, success_score DESC LIMIT 20`, [this.teamId, `%${term}%`, `%${term}%`, `%${term}%`, memberId || '']);
            memories.push(...results);
        }
        // Deduplicate and return top results
        const uniqueMemories = this.deduplicateMemories(memories);
        return uniqueMemories.slice(0, 15);
    }
    /**
     * Memory Voting System
     */
    async voteOnMemory(memoryId, memberId, vote) {
        await this.runQuery(`INSERT OR REPLACE INTO team_memory_votes (id, memory_id, member_id, vote) VALUES (?, ?, ?, ?)`, [(0, uuid_1.v4)(), memoryId, memberId, vote]);
        // Update memory success score
        await this.updateMemorySuccessScore(memoryId);
    }
    async getMemoryVotes(memoryId) {
        const votes = await this.allQuery(`SELECT * FROM team_memory_votes WHERE memory_id = ?`, [memoryId]);
        return votes.map(v => ({
            memberId: v.member_id,
            vote: v.vote,
            timestamp: new Date(v.timestamp)
        }));
    }
    async updateMemorySuccessScore(memoryId) {
        const votes = await this.allQuery(`SELECT vote FROM team_memory_votes WHERE memory_id = ?`, [memoryId]);
        const upvotes = votes.filter(v => v.vote === 'upvote').length;
        const downvotes = votes.filter(v => v.vote === 'downvote').length;
        const totalVotes = upvotes + downvotes;
        const successScore = totalVotes > 0 ? (upvotes / totalVotes) : 0.5;
        await this.runQuery(`UPDATE team_memories SET success_score = ? WHERE id = ?`, [successScore, memoryId]);
    }
    /**
     * Memory Comments System
     */
    async addMemoryComment(memoryId, memberId, content, parentCommentId) {
        const commentId = (0, uuid_1.v4)();
        await this.runQuery(`INSERT INTO team_memory_comments (id, memory_id, member_id, content, parent_comment_id) VALUES (?, ?, ?, ?, ?)`, [commentId, memoryId, memberId, content, parentCommentId]);
        return commentId;
    }
    async getMemoryComments(memoryId) {
        const comments = await this.allQuery(`SELECT * FROM team_memory_comments WHERE memory_id = ? ORDER BY timestamp`, [memoryId]);
        return comments.map(c => ({
            id: c.id,
            memberId: c.member_id,
            content: c.content,
            timestamp: new Date(c.timestamp),
            parentCommentId: c.parent_comment_id
        }));
    }
    /**
     * Memory Usage Tracking
     */
    async trackMemoryUsage(memoryId, usedBy, context, success) {
        await this.runQuery(`INSERT INTO team_memory_usage (id, memory_id, used_by, context, success) VALUES (?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), memoryId, usedBy, context, success]);
        // Update usage count
        await this.runQuery(`UPDATE team_memories SET usage_count = usage_count + 1 WHERE id = ?`, [memoryId]);
    }
    /**
     * Team Analytics
     */
    async getTeamAnalytics() {
        const totalMemories = await this.getQuery(`SELECT COUNT(*) as count FROM team_memories WHERE team_id = ?`, [this.teamId]);
        const activeMemories = await this.getQuery(`SELECT COUNT(*) as count FROM team_memories WHERE team_id = ? AND updated_at > datetime('now', '-30 days')`, [this.teamId]);
        const contributors = await this.allQuery(`SELECT 
        tm.id, tm.name, tm.email,
        COUNT(DISTINCT mem.id) as memories_created,
        COUNT(DISTINCT usage.id) as memories_used,
        AVG(mem.success_score) as avg_success_score,
        MAX(mem.created_at) as last_contribution
       FROM team_members tm
       LEFT JOIN team_memories mem ON tm.id = mem.created_by
       LEFT JOIN team_memory_usage usage ON tm.id = usage.used_by
       WHERE tm.team_id = ?
       GROUP BY tm.id
       ORDER BY memories_created DESC`, [this.teamId]);
        const topContributors = contributors.map(c => ({
            memberId: c.id,
            name: c.name,
            memoriesCreated: c.memories_created || 0,
            memoriesUsed: c.memories_used || 0,
            successScore: c.avg_success_score || 0,
            lastContribution: c.last_contribution ? new Date(c.last_contribution) : new Date(0)
        }));
        // Calculate growth rate (memories created in last 30 days vs previous 30 days)
        const recentMemories = await this.getQuery(`SELECT COUNT(*) as count FROM team_memories 
       WHERE team_id = ? AND created_at > datetime('now', '-30 days')`, [this.teamId]);
        const previousMemories = await this.getQuery(`SELECT COUNT(*) as count FROM team_memories 
       WHERE team_id = ? AND created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')`, [this.teamId]);
        const memoryGrowthRate = previousMemories.count > 0 ?
            ((recentMemories.count - previousMemories.count) / previousMemories.count) * 100 : 0;
        return {
            totalMemories: totalMemories.count,
            activeMemories: activeMemories.count,
            topContributors,
            memoryGrowthRate,
            teamProductivityScore: this.calculateProductivityScore(totalMemories.count, activeMemories.count),
            knowledgeHealthScore: this.calculateKnowledgeHealthScore(topContributors),
            collaborationIndex: this.calculateCollaborationIndex(topContributors),
            memoryUtilizationRate: this.calculateUtilizationRate(totalMemories.count, contributors.length)
        };
    }
    calculateProductivityScore(total, active) {
        if (total === 0)
            return 0;
        const activityRate = active / total;
        const volumeScore = Math.min(total / 100, 1); // Normalize to 100 memories
        return (activityRate * 0.6 + volumeScore * 0.4) * 100;
    }
    calculateKnowledgeHealthScore(contributors) {
        if (contributors.length === 0)
            return 0;
        const avgSuccessScore = contributors.reduce((sum, c) => sum + c.successScore, 0) / contributors.length;
        const distributionScore = contributors.length > 1 ?
            1 - (Math.max(...contributors.map(c => c.memoriesCreated)) / contributors.reduce((sum, c) => sum + c.memoriesCreated, 0)) : 0;
        return (avgSuccessScore * 0.7 + distributionScore * 0.3) * 100;
    }
    calculateCollaborationIndex(contributors) {
        if (contributors.length === 0)
            return 0;
        const totalMemories = contributors.reduce((sum, c) => sum + c.memoriesCreated, 0);
        const totalUsage = contributors.reduce((sum, c) => sum + c.memoriesUsed, 0);
        if (totalMemories === 0)
            return 0;
        const crossUtilization = totalUsage / totalMemories;
        const memberDistribution = contributors.filter(c => c.memoriesCreated > 0).length / contributors.length;
        return (crossUtilization * 0.6 + memberDistribution * 0.4) * 100;
    }
    calculateUtilizationRate(totalMemories, teamSize) {
        if (teamSize === 0)
            return 0;
        const memoriesPerMember = totalMemories / teamSize;
        return Math.min(memoriesPerMember / 10, 1) * 100; // Normalize to 10 memories per member
    }
}
exports.TeamMemoryEngine = TeamMemoryEngine;
exports.default = TeamMemoryEngine;
//# sourceMappingURL=teamMemoryEngine.js.map