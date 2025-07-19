"use strict";
/**
 * Memory Permissions & Access Control System
 * Enterprise-grade security for $1,000/seat/month teams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPermissionsEngine = void 0;
const uuid_1 = require("uuid");
class MemoryPermissionsEngine {
    constructor(teamMemoryEngine) {
        this.permissionRules = new Map();
        this.accessRequests = new Map();
        this.auditLogs = [];
        // Default permission matrix for different roles
        this.defaultPermissions = {
            'admin': {
                'read': true,
                'write': true,
                'delete': true,
                'share': true,
                'vote': true,
                'comment': true,
                'moderate': true,
                'admin': true
            },
            'developer': {
                'read': true,
                'write': true,
                'delete': false,
                'share': true,
                'vote': true,
                'comment': true,
                'moderate': false,
                'admin': false
            },
            'observer': {
                'read': true,
                'write': false,
                'delete': false,
                'share': false,
                'vote': true,
                'comment': true,
                'moderate': false,
                'admin': false
            }
        };
        this.teamMemoryEngine = teamMemoryEngine;
    }
    /**
     * Core Permission Checking
     */
    async checkPermission(userId, action, resourceType, resourceId, context) {
        try {
            // Get user's team membership
            const members = await this.teamMemoryEngine.getTeamMembers();
            const user = members.find(m => m.id === userId);
            if (!user) {
                await this.logAudit(userId, 'permission_check', resourceType, resourceId || '', false, 'User not found');
                return false;
            }
            // Check if user has explicit permission rules
            const explicitPermission = await this.checkExplicitPermissions(userId, action, resourceType, resourceId);
            if (explicitPermission !== null) {
                await this.logAudit(userId, 'permission_check', resourceType, resourceId || '', explicitPermission);
                return explicitPermission;
            }
            // Check role-based permissions
            const rolePermission = this.checkRolePermissions(user.role, action);
            // Check memory-specific permissions
            if (resourceType === 'memory' && resourceId) {
                const memoryPermission = await this.checkMemoryPermissions(userId, action, resourceId);
                const result = rolePermission && memoryPermission;
                await this.logAudit(userId, 'permission_check', resourceType, resourceId, result);
                return result;
            }
            await this.logAudit(userId, 'permission_check', resourceType, resourceId || '', rolePermission);
            return rolePermission;
        }
        catch (error) {
            await this.logAudit(userId, 'permission_check', resourceType, resourceId || '', false, error.message);
            return false;
        }
    }
    async checkExplicitPermissions(userId, action, resourceType, resourceId) {
        const rules = Array.from(this.permissionRules.values()).filter(rule => rule.isActive &&
            rule.resourceType === resourceType &&
            (rule.subjectType === 'user' && rule.subjectId === userId) &&
            (!resourceId || rule.resourceId === resourceId));
        for (const rule of rules) {
            const permission = rule.permissions.find(p => p.action === action);
            if (permission) {
                // Check conditions
                if (rule.conditions && rule.conditions.length > 0) {
                    const conditionsMet = await this.evaluateConditions(rule.conditions, userId, resourceType, resourceId);
                    if (!conditionsMet)
                        continue;
                }
                return permission.granted;
            }
        }
        return null; // No explicit permission found
    }
    checkRolePermissions(role, action) {
        return this.defaultPermissions[role]?.[action] || false;
    }
    async checkMemoryPermissions(userId, action, memoryId) {
        const memories = await this.teamMemoryEngine.getTeamMemories();
        const memory = memories.find(m => m.id === memoryId);
        if (!memory)
            return false;
        // Memory owner has full permissions
        if (memory.createdBy === userId) {
            return true;
        }
        // Check visibility settings
        switch (memory.visibility) {
            case 'private':
                return false; // Only owner can access private memories
            case 'team_only':
                return true; // Team members can access team-only memories
            case 'public':
                return true; // Everyone can access public memories
            default:
                return false;
        }
    }
    async evaluateConditions(conditions, userId, resourceType, resourceId) {
        for (const condition of conditions) {
            switch (condition.type) {
                case 'time_window':
                    if (!this.isInTimeWindow(condition.value))
                        return false;
                    break;
                case 'memory_type':
                    if (resourceType === 'memory' && resourceId) {
                        const memories = await this.teamMemoryEngine.getTeamMemories();
                        const memory = memories.find(m => m.id === resourceId);
                        if (memory && memory.type !== condition.value)
                            return false;
                    }
                    break;
                case 'approval_required':
                    const hasApproval = await this.checkApprovalStatus(userId, resourceType, resourceId);
                    if (!hasApproval)
                        return false;
                    break;
            }
        }
        return true;
    }
    isInTimeWindow(timeWindow) {
        const now = new Date();
        const start = new Date(timeWindow.start);
        const end = new Date(timeWindow.end);
        return now >= start && now <= end;
    }
    async checkApprovalStatus(userId, resourceType, resourceId) {
        const request = Array.from(this.accessRequests.values()).find(req => req.requesterId === userId &&
            req.resourceType === resourceType &&
            req.resourceId === resourceId &&
            req.status === 'approved');
        return !!request;
    }
    /**
     * Permission Rule Management
     */
    async createPermissionRule(rule) {
        const ruleId = (0, uuid_1.v4)();
        const permissionRule = {
            ...rule,
            id: ruleId,
            createdAt: new Date()
        };
        this.permissionRules.set(ruleId, permissionRule);
        await this.logAudit(rule.createdBy, 'create_permission_rule', 'permission_rule', ruleId, true);
        return ruleId;
    }
    async updatePermissionRule(ruleId, updates, updatedBy) {
        const rule = this.permissionRules.get(ruleId);
        if (!rule)
            return false;
        const updatedRule = { ...rule, ...updates };
        this.permissionRules.set(ruleId, updatedRule);
        await this.logAudit(updatedBy, 'update_permission_rule', 'permission_rule', ruleId, true);
        return true;
    }
    async deletePermissionRule(ruleId, deletedBy) {
        const rule = this.permissionRules.get(ruleId);
        if (!rule)
            return false;
        rule.isActive = false;
        await this.logAudit(deletedBy, 'delete_permission_rule', 'permission_rule', ruleId, true);
        return true;
    }
    async getPermissionRules(filters) {
        let rules = Array.from(this.permissionRules.values());
        if (filters) {
            if (filters.resourceType) {
                rules = rules.filter(r => r.resourceType === filters.resourceType);
            }
            if (filters.resourceId) {
                rules = rules.filter(r => r.resourceId === filters.resourceId);
            }
            if (filters.subjectId) {
                rules = rules.filter(r => r.subjectId === filters.subjectId);
            }
            if (filters.isActive !== undefined) {
                rules = rules.filter(r => r.isActive === filters.isActive);
            }
        }
        return rules;
    }
    /**
     * Access Request Management
     */
    async createAccessRequest(request) {
        const requestId = (0, uuid_1.v4)();
        const accessRequest = {
            ...request,
            id: requestId,
            createdAt: new Date(),
            status: 'pending'
        };
        this.accessRequests.set(requestId, accessRequest);
        await this.logAudit(request.requesterId, 'create_access_request', request.resourceType, request.resourceId, true);
        return requestId;
    }
    async approveAccessRequest(requestId, approverId, approverName) {
        const request = this.accessRequests.get(requestId);
        if (!request || request.status !== 'pending')
            return false;
        request.status = 'approved';
        request.approvedAt = new Date();
        request.approvedBy = approverId;
        await this.logAudit(approverId, 'approve_access_request', request.resourceType, request.resourceId, true);
        // Create temporary permission rule
        await this.createPermissionRule({
            resourceType: request.resourceType,
            resourceId: request.resourceId,
            subjectType: 'user',
            subjectId: request.requesterId,
            permissions: request.requestedPermissions,
            createdBy: approverId,
            expiresAt: request.expiresAt,
            isActive: true
        });
        return true;
    }
    async denyAccessRequest(requestId, denierId, reason) {
        const request = this.accessRequests.get(requestId);
        if (!request || request.status !== 'pending')
            return false;
        request.status = 'denied';
        request.denyReason = reason;
        await this.logAudit(denierId, 'deny_access_request', request.resourceType, request.resourceId, true);
        return true;
    }
    async getAccessRequests(filters) {
        let requests = Array.from(this.accessRequests.values());
        if (filters) {
            if (filters.requesterId) {
                requests = requests.filter(r => r.requesterId === filters.requesterId);
            }
            if (filters.status) {
                requests = requests.filter(r => r.status === filters.status);
            }
            if (filters.resourceType) {
                requests = requests.filter(r => r.resourceType === filters.resourceType);
            }
        }
        return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Memory Sharing Functions
     */
    async shareMemory(memoryId, sharedBy, sharedWith, permissions, message) {
        const hasPermission = await this.checkPermission(sharedBy, 'share', 'memory', memoryId);
        if (!hasPermission)
            return false;
        for (const userId of sharedWith) {
            await this.createPermissionRule({
                resourceType: 'memory',
                resourceId: memoryId,
                subjectType: 'user',
                subjectId: userId,
                permissions,
                createdBy: sharedBy,
                isActive: true
            });
        }
        await this.logAudit(sharedBy, 'share_memory', 'memory', memoryId, true, undefined, { sharedWith, message });
        return true;
    }
    async revokeMemoryAccess(memoryId, revokedBy, revokedFrom) {
        const hasPermission = await this.checkPermission(revokedBy, 'admin', 'memory', memoryId);
        if (!hasPermission)
            return false;
        const rules = await this.getPermissionRules({
            resourceType: 'memory',
            resourceId: memoryId,
            subjectId: revokedFrom,
            isActive: true
        });
        for (const rule of rules) {
            await this.deletePermissionRule(rule.id, revokedBy);
        }
        await this.logAudit(revokedBy, 'revoke_memory_access', 'memory', memoryId, true, undefined, { revokedFrom });
        return true;
    }
    /**
     * Audit Logging
     */
    async logAudit(userId, action, resourceType, resourceId, success, errorMessage, metadata) {
        const members = await this.teamMemoryEngine.getTeamMembers();
        const user = members.find(m => m.id === userId);
        const auditLog = {
            id: (0, uuid_1.v4)(),
            userId,
            userName: user?.name || 'Unknown',
            action,
            resourceType,
            resourceId,
            resourceName: resourceId,
            timestamp: new Date(),
            success,
            errorMessage,
            metadata
        };
        this.auditLogs.push(auditLog);
        // Keep only last 10,000 logs in memory
        if (this.auditLogs.length > 10000) {
            this.auditLogs = this.auditLogs.slice(-10000);
        }
    }
    async getAuditLogs(filters) {
        let logs = [...this.auditLogs];
        if (filters) {
            if (filters.userId) {
                logs = logs.filter(l => l.userId === filters.userId);
            }
            if (filters.action) {
                logs = logs.filter(l => l.action === filters.action);
            }
            if (filters.resourceType) {
                logs = logs.filter(l => l.resourceType === filters.resourceType);
            }
            if (filters.startDate) {
                logs = logs.filter(l => l.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                logs = logs.filter(l => l.timestamp <= filters.endDate);
            }
        }
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (filters?.limit) {
            logs = logs.slice(0, filters.limit);
        }
        return logs;
    }
    /**
     * Bulk Operations
     */
    async bulkUpdatePermissions(updates, updatedBy) {
        for (const update of updates) {
            await this.createPermissionRule({
                resourceType: update.resourceType,
                resourceId: update.resourceId,
                subjectType: 'user',
                subjectId: update.userId,
                permissions: update.permissions,
                createdBy: updatedBy,
                isActive: true
            });
        }
        await this.logAudit(updatedBy, 'bulk_update_permissions', 'permission_rule', 'bulk', true, undefined, { count: updates.length });
        return true;
    }
    /**
     * Compliance & Reporting
     */
    async generateComplianceReport(startDate, endDate) {
        const logs = await this.getAuditLogs({ startDate, endDate });
        const uniqueUsers = new Set(logs.map(l => l.userId)).size;
        const permissionChanges = logs.filter(l => l.action.includes('permission')).length;
        const accessRequests = logs.filter(l => l.action.includes('access_request')).length;
        const securityEvents = logs.filter(l => !l.success).length;
        const actionCounts = logs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {});
        const topActions = Object.entries(actionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([action, count]) => ({ action, count }));
        const riskEvents = logs.filter(l => !l.success ||
            l.action.includes('delete') ||
            l.action.includes('admin'));
        return {
            totalActions: logs.length,
            uniqueUsers,
            permissionChanges,
            accessRequests,
            securityEvents,
            topActions,
            riskEvents
        };
    }
}
exports.MemoryPermissionsEngine = MemoryPermissionsEngine;
exports.default = MemoryPermissionsEngine;
//# sourceMappingURL=memoryPermissions.js.map