"use strict";
/**
 * Team Dashboard Engine - Real-time Team Intelligence Visualization
 * Worth every penny of that $1,000/seat/month price tag
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamDashboard = void 0;
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
class TeamDashboard {
    constructor(teamMemoryEngine, port = 3000) {
        this.teamMemoryEngine = teamMemoryEngine;
        this.app = (0, express_1.default)();
        this.port = port;
        this.setupRoutes();
    }
    setupRoutes() {
        this.app.use(express_1.default.static(path.join(__dirname, '../../../dashboard')));
        this.app.use(express_1.default.json());
        // Main dashboard data endpoint
        this.app.get('/api/dashboard', async (req, res) => {
            try {
                const dashboardData = await this.generateDashboardData();
                res.json(dashboardData);
            }
            catch (error) {
                console.error('Dashboard data error:', error);
                res.status(500).json({ error: 'Failed to generate dashboard data' });
            }
        });
        // Real-time activity feed
        this.app.get('/api/activity', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const activity = await this.getActivityFeed(limit);
                res.json(activity);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch activity feed' });
            }
        });
        // Knowledge graph data
        this.app.get('/api/knowledge-graph', async (req, res) => {
            try {
                const graphData = await this.generateKnowledgeGraph();
                res.json(graphData);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to generate knowledge graph' });
            }
        });
        // Team analytics endpoint
        this.app.get('/api/analytics', async (req, res) => {
            try {
                const analytics = await this.teamMemoryEngine.getTeamAnalytics();
                res.json(analytics);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch analytics' });
            }
        });
        // Member detailed stats
        this.app.get('/api/member/:id/stats', async (req, res) => {
            try {
                const memberId = req.params.id;
                const stats = await this.getMemberDetailedStats(memberId);
                res.json(stats);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch member stats' });
            }
        });
        // Memory search and filtering
        this.app.post('/api/memories/search', async (req, res) => {
            try {
                const { query, filters } = req.body;
                const memories = await this.teamMemoryEngine.searchTeamMemories(query);
                res.json(memories);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to search memories' });
            }
        });
        // Vote on memory
        this.app.post('/api/memory/:id/vote', async (req, res) => {
            try {
                const memoryId = req.params.id;
                const { memberId, vote } = req.body;
                await this.teamMemoryEngine.voteOnMemory(memoryId, memberId, vote);
                res.json({ success: true });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to vote on memory' });
            }
        });
        // Serve the dashboard HTML
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../../dashboard/index.html'));
        });
    }
    async getMemberDetailedStats(memberId) {
        const members = await this.teamMemoryEngine.getTeamMembers();
        const member = members.find(m => m.id === memberId);
        if (!member) {
            return null;
        }
        const analytics = await this.teamMemoryEngine.getTeamAnalytics();
        const contributorStats = analytics.topContributors.find(c => c.memberId === member.id);
        return {
            member,
            stats: {
                memoriesCreated: contributorStats?.memoriesCreated || 0,
                memoriesUsed: contributorStats?.memoriesUsed || 0,
                successRate: contributorStats?.successScore || 0,
                collaborationScore: this.calculateCollaborationScore(member, analytics),
                recentActivity: this.calculateRecentActivity(member),
                streak: this.calculateStreak(member),
                badges: this.calculateBadges(member, contributorStats)
            },
            trend: this.calculateMemberTrend(member)
        };
    }
    async generateDashboardData() {
        const [teamOverview, analytics, recentActivity, knowledgeGraph, topMemories, memberStats, alerts] = await Promise.all([
            this.generateTeamOverview(),
            this.teamMemoryEngine.getTeamAnalytics(),
            this.getActivityFeed(20),
            this.generateKnowledgeGraph(),
            this.getTopMemories(),
            this.generateMemberStats(),
            this.generateAlerts()
        ]);
        return {
            teamOverview,
            analytics,
            recentActivity,
            knowledgeGraph,
            topMemories,
            memberStats,
            alerts
        };
    }
    async generateTeamOverview() {
        const members = await this.teamMemoryEngine.getTeamMembers();
        const analytics = await this.teamMemoryEngine.getTeamAnalytics();
        const teamScore = this.calculateOverallTeamScore(analytics);
        const trend = this.calculateTrend(analytics.memoryGrowthRate);
        return {
            teamName: 'Development Team',
            memberCount: members.length,
            totalMemories: analytics.totalMemories,
            activeProjects: 5,
            teamScore,
            trend,
            lastUpdated: new Date()
        };
    }
    async getActivityFeed(limit) {
        // This would query actual activity logs
        // For now, we'll simulate some activity
        const activities = [
            {
                id: '1',
                type: 'memory_created',
                actor: 'user1',
                actorName: 'John Doe',
                target: 'memory1',
                targetName: 'Authentication Pattern',
                timestamp: new Date(Date.now() - 1000 * 60 * 15),
                impact: 'high',
                description: 'Created new authentication pattern for OAuth implementation'
            },
            {
                id: '2',
                type: 'memory_used',
                actor: 'user2',
                actorName: 'Jane Smith',
                target: 'memory2',
                targetName: 'Database Migration Strategy',
                timestamp: new Date(Date.now() - 1000 * 60 * 30),
                impact: 'medium',
                description: 'Applied database migration pattern to user service'
            }
        ];
        return activities.slice(0, limit);
    }
    async generateKnowledgeGraph() {
        const memories = await this.teamMemoryEngine.getTeamMemories();
        const members = await this.teamMemoryEngine.getTeamMembers();
        const nodes = [];
        // Add memory nodes
        memories.forEach((memory, index) => {
            nodes.push({
                id: memory.id,
                name: memory.title,
                type: 'memory',
                size: memory.usageCount * 10 + 20,
                connections: [memory.createdBy],
                x: Math.random() * 800,
                y: Math.random() * 600,
                color: this.getMemoryColor(memory.type),
                metadata: {
                    type: memory.type,
                    successScore: memory.successScore,
                    usageCount: memory.usageCount
                }
            });
        });
        // Add member nodes
        members.forEach((member, index) => {
            nodes.push({
                id: member.id,
                name: member.name,
                type: 'member',
                size: 40,
                connections: memories.filter(m => m.createdBy === member.id).map(m => m.id),
                x: Math.random() * 800,
                y: Math.random() * 600,
                color: '#00f5ff',
                metadata: {
                    role: member.role,
                    email: member.email
                }
            });
        });
        return nodes;
    }
    async getTopMemories() {
        const memories = await this.teamMemoryEngine.getTeamMemories();
        return memories
            .sort((a, b) => (b.usageCount * b.successScore) - (a.usageCount * a.successScore))
            .slice(0, 10);
    }
    async generateMemberStats() {
        const members = await this.teamMemoryEngine.getTeamMembers();
        const analytics = await this.teamMemoryEngine.getTeamAnalytics();
        return members.map(member => {
            const contributorStats = analytics.topContributors.find(c => c.memberId === member.id);
            return {
                member,
                stats: {
                    memoriesCreated: contributorStats?.memoriesCreated || 0,
                    memoriesUsed: contributorStats?.memoriesUsed || 0,
                    successRate: contributorStats?.successScore || 0,
                    collaborationScore: this.calculateCollaborationScore(member, analytics),
                    recentActivity: this.calculateRecentActivity(member),
                    streak: this.calculateStreak(member),
                    badges: this.calculateBadges(member, contributorStats)
                },
                trend: this.calculateMemberTrend(member)
            };
        });
    }
    async generateAlerts() {
        const alerts = [];
        const analytics = await this.teamMemoryEngine.getTeamAnalytics();
        // Knowledge gap alert
        if (analytics.knowledgeHealthScore < 60) {
            alerts.push({
                id: 'knowledge_gap',
                type: 'knowledge_gap',
                severity: 'warning',
                title: 'Knowledge Quality Below Target',
                message: `Team knowledge health score is ${analytics.knowledgeHealthScore.toFixed(1)}%. Consider reviewing and improving low-quality memories.`,
                actionable: true,
                suggestedAction: 'Review memories with low success scores',
                timestamp: new Date()
            });
        }
        // Low engagement alert
        if (analytics.collaborationIndex < 50) {
            alerts.push({
                id: 'low_engagement',
                type: 'low_engagement',
                severity: 'warning',
                title: 'Low Team Collaboration',
                message: `Collaboration index is ${analytics.collaborationIndex.toFixed(1)}%. Team members aren't sharing knowledge effectively.`,
                actionable: true,
                suggestedAction: 'Encourage team members to use and vote on memories',
                timestamp: new Date()
            });
        }
        return alerts;
    }
    // Helper methods
    calculateOverallTeamScore(analytics) {
        return Math.round((analytics.teamProductivityScore * 0.3) +
            (analytics.knowledgeHealthScore * 0.3) +
            (analytics.collaborationIndex * 0.2) +
            (analytics.memoryUtilizationRate * 0.2));
    }
    calculateTrend(growthRate) {
        if (growthRate > 5)
            return 'up';
        if (growthRate < -5)
            return 'down';
        return 'stable';
    }
    getMemoryColor(type) {
        const colors = {
            'architectural_decision': '#ff6b6b',
            'code_pattern': '#4ecdc4',
            'conversation': '#45b7d1',
            'best_practice': '#f9ca24',
            'lesson_learned': '#f0932b'
        };
        return colors[type] || '#6c5ce7';
    }
    calculateCollaborationScore(member, analytics) {
        const memberStats = analytics.topContributors.find(c => c.memberId === member.id);
        if (!memberStats)
            return 0;
        const createdWeight = 0.4;
        const usedWeight = 0.6;
        return Math.round((memberStats.memoriesCreated * createdWeight) +
            (memberStats.memoriesUsed * usedWeight));
    }
    calculateRecentActivity(member) {
        const daysSinceLastActive = (Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0, 10 - daysSinceLastActive);
    }
    calculateStreak(member) {
        // This would calculate consecutive days of activity
        return Math.floor(Math.random() * 15) + 1; // Placeholder
    }
    calculateBadges(member, stats) {
        const badges = [];
        if (stats?.memoriesCreated > 50)
            badges.push('Knowledge Creator');
        if (stats?.successScore > 0.8)
            badges.push('Quality Expert');
        if (stats?.memoriesUsed > 100)
            badges.push('Active Learner');
        if (member.role === 'admin')
            badges.push('Team Lead');
        return badges;
    }
    calculateMemberTrend(member) {
        // This would analyze member activity trends
        const trends = ['up', 'down', 'stable'];
        return trends[Math.floor(Math.random() * trends.length)];
    }
    async start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                console.log(`🚀 Team Dashboard running on http://localhost:${this.port}`);
                resolve();
            });
        });
    }
    async generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeContext AI - Team Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/d3@7"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .dashboard { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; }
        
        .sidebar {
            background: #1a1a2e;
            border-right: 1px solid #16213e;
            padding: 2rem 1rem;
        }
        
        .logo { 
            font-size: 1.5rem; 
            font-weight: bold; 
            color: #00f5ff; 
            margin-bottom: 2rem;
        }
        
        .nav-item {
            padding: 0.75rem 1rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .nav-item:hover, .nav-item.active {
            background: rgba(0, 245, 255, 0.1);
            color: #00f5ff;
        }
        
        .main-content {
            padding: 2rem;
            overflow-y: auto;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .dashboard-title {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(135deg, #00f5ff, #ff0080);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .team-score {
            background: linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(255, 0, 128, 0.1));
            border: 1px solid rgba(0, 245, 255, 0.3);
            padding: 1rem 2rem;
            border-radius: 12px;
            text-align: center;
        }
        
        .score-number {
            font-size: 2rem;
            font-weight: bold;
            color: #00f5ff;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .dashboard-card {
            background: #1a1a2e;
            border: 1px solid #16213e;
            border-radius: 16px;
            padding: 1.5rem;
            transition: transform 0.2s;
        }
        
        .dashboard-card:hover {
            transform: translateY(-2px);
            border-color: #00f5ff;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .card-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #00f5ff;
        }
        
        .card-trend {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .trend-up { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
        .trend-down { background: rgba(255, 69, 0, 0.2); color: #ff4500; }
        .trend-stable { background: rgba(156, 163, 175, 0.2); color: #9ca3af; }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            color: #9ca3af;
            font-size: 0.9rem;
        }
        
        .chart-container {
            height: 200px;
            margin: 1rem 0;
        }
        
        .knowledge-graph {
            height: 400px;
            border: 1px solid #16213e;
            border-radius: 12px;
            margin: 1rem 0;
        }
        
        .activity-feed {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            margin: 0.5rem 0;
            background: rgba(0, 245, 255, 0.05);
            border-radius: 8px;
            border-left: 3px solid #00f5ff;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00f5ff, #ff0080);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-size: 1.2rem;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-title {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.25rem;
        }
        
        .activity-description {
            color: #9ca3af;
            font-size: 0.9rem;
        }
        
        .activity-time {
            color: #6b7280;
            font-size: 0.8rem;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin: 0.5rem 0;
            display: flex;
            align-items: center;
        }
        
        .alert-critical {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
        }
        
        .alert-warning {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #fbbf24;
        }
        
        .alert-info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #60a5fa;
        }
        
        .member-card {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: rgba(0, 245, 255, 0.05);
            border-radius: 8px;
            margin: 0.5rem 0;
        }
        
        .member-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00f5ff, #ff0080);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-weight: bold;
            color: #ffffff;
        }
        
        .member-info {
            flex: 1;
        }
        
        .member-name {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.25rem;
        }
        
        .member-stats {
            display: flex;
            gap: 1rem;
            font-size: 0.8rem;
            color: #9ca3af;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 500;
            background: rgba(0, 245, 255, 0.2);
            color: #00f5ff;
        }
        
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #9ca3af;
        }
        
        @media (max-width: 768px) {
            .dashboard { grid-template-columns: 1fr; }
            .sidebar { display: none; }
            .dashboard-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="sidebar">
            <div class="logo">🧠 CodeContext AI</div>
            <div class="nav-item active" onclick="showSection('overview')">📊 Overview</div>
            <div class="nav-item" onclick="showSection('analytics')">📈 Analytics</div>
            <div class="nav-item" onclick="showSection('memories')">🧠 Memories</div>
            <div class="nav-item" onclick="showSection('members')">👥 Members</div>
            <div class="nav-item" onclick="showSection('graph')">🌐 Knowledge Graph</div>
            <div class="nav-item" onclick="showSection('alerts')">🚨 Alerts</div>
        </div>
        
        <div class="main-content">
            <div class="dashboard-header">
                <div class="dashboard-title">Team Intelligence Dashboard</div>
                <div class="team-score">
                    <div class="score-number" id="teamScore">--</div>
                    <div class="metric-label">Team Score</div>
                </div>
            </div>
            
            <div id="overview-section">
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Total Memories</div>
                            <div class="card-trend trend-up" id="memoriesTrend">↗ +12%</div>
                        </div>
                        <div class="metric-value" id="totalMemories">--</div>
                        <div class="metric-label">Knowledge artifacts stored</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Team Members</div>
                            <div class="card-trend trend-stable" id="membersTrend">→ Stable</div>
                        </div>
                        <div class="metric-value" id="memberCount">--</div>
                        <div class="metric-label">Active contributors</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Knowledge Health</div>
                            <div class="card-trend trend-up" id="healthTrend">↗ +8%</div>
                        </div>
                        <div class="metric-value" id="knowledgeHealth">--</div>
                        <div class="metric-label">Quality score</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Collaboration Index</div>
                            <div class="card-trend trend-up" id="collaborationTrend">↗ +15%</div>
                        </div>
                        <div class="metric-value" id="collaborationIndex">--</div>
                        <div class="metric-label">Team synergy</div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Recent Activity</div>
                        </div>
                        <div class="activity-feed" id="activityFeed">
                            <div class="loading">Loading activity...</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">Team Members</div>
                        </div>
                        <div id="membersList">
                            <div class="loading">Loading members...</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="graph-section" style="display: none;">
                <div class="dashboard-card">
                    <div class="card-header">
                        <div class="card-title">Knowledge Graph</div>
                    </div>
                    <div class="knowledge-graph" id="knowledgeGraph">
                        <div class="loading">Loading knowledge graph...</div>
                    </div>
                </div>
            </div>
            
            <div id="alerts-section" style="display: none;">
                <div class="dashboard-card">
                    <div class="card-header">
                        <div class="card-title">Alerts & Recommendations</div>
                    </div>
                    <div id="alertsList">
                        <div class="loading">Loading alerts...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Dashboard JavaScript
        let dashboardData = null;
        
        async function loadDashboard() {
            try {
                const response = await fetch('/api/dashboard');
                dashboardData = await response.json();
                updateDashboard();
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }
        
        function updateDashboard() {
            if (!dashboardData) return;
            
            const { teamOverview, analytics, recentActivity, memberStats, alerts } = dashboardData;
            
            // Update overview metrics
            document.getElementById('teamScore').textContent = teamOverview.teamScore;
            document.getElementById('totalMemories').textContent = teamOverview.totalMemories;
            document.getElementById('memberCount').textContent = teamOverview.memberCount;
            document.getElementById('knowledgeHealth').textContent = Math.round(analytics.knowledgeHealthScore);
            document.getElementById('collaborationIndex').textContent = Math.round(analytics.collaborationIndex);
            
            // Update activity feed
            updateActivityFeed(recentActivity);
            
            // Update members list
            updateMembersList(memberStats);
            
            // Update alerts
            updateAlerts(alerts);
        }
        
        function updateActivityFeed(activities) {
            const feedElement = document.getElementById('activityFeed');
            feedElement.innerHTML = activities.map(activity => \`
                <div class="activity-item">
                    <div class="activity-icon">🧠</div>
                    <div class="activity-content">
                        <div class="activity-title">\${activity.description}</div>
                        <div class="activity-time">\${formatTime(activity.timestamp)}</div>
                    </div>
                </div>
            \`).join('');
        }
        
        function updateMembersList(memberStats) {
            const listElement = document.getElementById('membersList');
            listElement.innerHTML = memberStats.map(member => \`
                <div class="member-card">
                    <div class="member-avatar">\${member.member.name.charAt(0).toUpperCase()}</div>
                    <div class="member-info">
                        <div class="member-name">\${member.member.name}</div>
                        <div class="member-stats">
                            <div class="stat-item">📝 \${member.stats.memoriesCreated}</div>
                            <div class="stat-item">🎯 \${Math.round(member.stats.successRate * 100)}%</div>
                            <div class="stat-item">🤝 \${member.stats.collaborationScore}</div>
                        </div>
                        <div style="margin-top: 0.5rem;">
                            \${member.stats.badges.map(badge => \`<span class="badge">\${badge}</span>\`).join(' ')}
                        </div>
                    </div>
                </div>
            \`).join('');
        }
        
        function updateAlerts(alerts) {
            const alertsElement = document.getElementById('alertsList');
            alertsElement.innerHTML = alerts.map(alert => \`
                <div class="alert alert-\${alert.severity}">
                    <div>
                        <div style="font-weight: 600;">\${alert.title}</div>
                        <div style="font-size: 0.9rem; margin-top: 0.25rem;">\${alert.message}</div>
                        \${alert.suggestedAction ? \`<div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.8;">💡 \${alert.suggestedAction}</div>\` : ''}
                    </div>
                </div>
            \`).join('');
        }
        
        function showSection(sectionName) {
            // Hide all sections
            document.querySelectorAll('[id$="-section"]').forEach(section => {
                section.style.display = 'none';
            });
            
            // Show selected section
            document.getElementById(sectionName + '-section').style.display = 'block';
            
            // Update nav
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.classList.add('active');
        }
        
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d ago\`;
            if (hours > 0) return \`\${hours}h ago\`;
            if (minutes > 0) return \`\${minutes}m ago\`;
            return 'Just now';
        }
        
        // Initialize dashboard
        loadDashboard();
        
        // Refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
    `;
    }
}
exports.TeamDashboard = TeamDashboard;
exports.default = TeamDashboard;
//# sourceMappingURL=teamDashboard.js.map