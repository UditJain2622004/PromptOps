import { workspaceUserRole } from '../generated/prisma/client.ts'

// ─── Permission Actions ─────────────────────────────────────────────────────

export type PermissionAction =
  // Workspace operations
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:invite'
  | 'workspace:change-role'
  // Agent operations
  | 'agent:create'
  | 'agent:update'
  | 'agent:delete'
  | 'agent:version:create'
  | 'agent:version:activate'
  // Evaluation operations
  | 'evaluation:definition:create'
  | 'evaluation:definition:update'
  | 'evaluation:definition:delete'
  | 'evaluation:run:create'
  // Dataset operations
  | 'dataset:create'
  | 'dataset:update'
  | 'dataset:delete'
  | 'dataset:item:create'
  | 'dataset:item:update'
  | 'dataset:item:delete'
  // Gateway operations
  | 'gateway:execute'

// ─── Permission Matrix ──────────────────────────────────────────────────────

const PERMISSIONS: Record<PermissionAction, workspaceUserRole[]> = {
  // Workspace: OWNER only (except invite)
  'workspace:update': ['OWNER'],
  'workspace:delete': ['OWNER'],
  'workspace:invite': ['OWNER', 'ADMIN'],
  'workspace:change-role': ['OWNER'],

  // Agent: OWNER + ADMIN for most, OWNER only for delete
  'agent:create': ['OWNER', 'ADMIN'],
  'agent:update': ['OWNER', 'ADMIN'],
  'agent:delete': ['OWNER'],
  'agent:version:create': ['OWNER', 'ADMIN'],
  'agent:version:activate': ['OWNER', 'ADMIN'],

  // Evaluation: OWNER + ADMIN for most, OWNER only for delete
  'evaluation:definition:create': ['OWNER', 'ADMIN'],
  'evaluation:definition:update': ['OWNER', 'ADMIN'],
  'evaluation:definition:delete': ['OWNER'],
  'evaluation:run:create': ['OWNER', 'ADMIN'],

  // Dataset: OWNER + ADMIN for most, OWNER only for delete
  'dataset:create': ['OWNER', 'ADMIN'],
  'dataset:update': ['OWNER', 'ADMIN'],
  'dataset:delete': ['OWNER'],
  'dataset:item:create': ['OWNER', 'ADMIN'],
  'dataset:item:update': ['OWNER', 'ADMIN'],
  'dataset:item:delete': ['OWNER'],

  // Gateway: All workspace members can execute
  'gateway:execute': ['OWNER', 'ADMIN', 'USER'],
}

// ─── Permission Check ───────────────────────────────────────────────────────

export interface RbacCheckResult {
  allowed: boolean
  error?: string
}

export function checkPermission(
  role: workspaceUserRole,
  action: PermissionAction
): RbacCheckResult {
  const allowedRoles = PERMISSIONS[action]

  if (!allowedRoles) {
    return { allowed: false, error: `Unknown action: ${action}` }
  }

  if (allowedRoles.includes(role)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    error: `Insufficient permissions: ${action} requires ${allowedRoles.join(' or ')} role`,
  }
}

// ─── Helper for Route Handlers ──────────────────────────────────────────────

export function assertPermission(
  role: workspaceUserRole,
  action: PermissionAction
): void {
  const result = checkPermission(role, action)
  if (!result.allowed) {
    const error = new Error(result.error) as Error & { statusCode: number }
    error.statusCode = 403
    throw error
  }
}

// ─── Role Hierarchy Check ───────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<workspaceUserRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  USER: 1,
}

export function isRoleHigherOrEqual(
  actorRole: workspaceUserRole,
  targetRole: workspaceUserRole
): boolean {
  return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole]
}

export function canAssignRole(
  actorRole: workspaceUserRole,
  targetRole: workspaceUserRole
): boolean {
  // Only OWNER can assign roles, and can assign any role
  if (actorRole !== 'OWNER') return false
  return true
}
