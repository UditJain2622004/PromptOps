import { PrismaClient, workspaceUserRole } from '../generated/prisma/client.ts'

export interface CreateWorkspaceInput {
  name: string
}

export interface WorkspaceWithRole {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
  role: workspaceUserRole
}

export interface InviteUserInput {
  email: string
  role?: workspaceUserRole
}

export interface ChangeRoleInput {
  role: workspaceUserRole
}

export interface WorkspaceMember {
  userId: number
  email: string
  name: string
  role: workspaceUserRole
  createdAt: Date
}

export class WorkspaceService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateWorkspaceInput, userId: number): Promise<WorkspaceWithRole> {
    const { name } = input

    // Create workspace and membership in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name,
          createdById: userId,
          lastUpdatedById: userId,
        },
      })

      // Create WorkspaceUser with OWNER role
      await tx.workspaceUser.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: 'OWNER',
          createdById: userId,
          lastUpdatedById: userId,
        },
      })

      return workspace
    })

    return {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      role: 'OWNER',
    }
  }

  async listForUser(userId: number): Promise<WorkspaceWithRole[]> {
    const memberships = await this.prisma.workspaceUser.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    })

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      createdAt: m.workspace.createdAt,
      updatedAt: m.workspace.updatedAt,
      role: m.role,
    }))
  }

  async getMembership(userId: number, workspaceId: number) {
    return this.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: {
        workspace: true,
      },
    })
  }

  // ─── Delete Workspace ─────────────────────────────────────────────────────

  async deleteWorkspace(
    workspaceId: number
  ): Promise<{ success: true } | { success: false; error: string }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      return { success: false, error: 'Workspace not found' }
    }

    // Delete workspace (cascade will handle WorkspaceUser, Agent, etc.)
    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    })

    return { success: true }
  }

  // ─── Invite User ──────────────────────────────────────────────────────────

  async inviteUser(
    input: InviteUserInput,
    workspaceId: number,
    invitedByUserId: number
  ): Promise<{ success: true; member: WorkspaceMember } | { success: false; error: string }> {
    const { email, role = 'USER' } = input

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { success: false, error: 'User not found with this email' }
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    })

    if (existingMembership) {
      return { success: false, error: 'User is already a member of this workspace' }
    }

    // Create membership
    const membership = await this.prisma.workspaceUser.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        createdById: invitedByUserId,
        lastUpdatedById: invitedByUserId,
      },
    })

    return {
      success: true,
      member: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        createdAt: membership.createdAt,
      },
    }
  }

  // ─── Change User Role ─────────────────────────────────────────────────────

  async changeUserRole(
    targetUserId: number,
    workspaceId: number,
    input: ChangeRoleInput,
    changedByUserId: number
  ): Promise<{ success: true; member: WorkspaceMember } | { success: false; error: string }> {
    const { role } = input

    // Find the membership
    const membership = await this.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        },
      },
      include: {
        user: true,
      },
    })

    if (!membership) {
      return { success: false, error: 'User is not a member of this workspace' }
    }

    // Prevent changing own role away from OWNER (optional safety guard)
    if (targetUserId === changedByUserId && membership.role === 'OWNER' && role !== 'OWNER') {
      return { success: false, error: 'Cannot change your own role away from OWNER' }
    }

    // Update the role
    const updated = await this.prisma.workspaceUser.update({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        },
      },
      data: {
        role,
        lastUpdatedById: changedByUserId,
      },
      include: {
        user: true,
      },
    })

    return {
      success: true,
      member: {
        userId: updated.userId,
        email: updated.user.email,
        name: updated.user.name,
        role: updated.role,
        createdAt: updated.createdAt,
      },
    }
  }

  // ─── List Workspace Members ───────────────────────────────────────────────

  async listMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    const memberships = await this.prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return memberships.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt,
    }))
  }
}
