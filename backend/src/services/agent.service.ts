import {
  PrismaClient,
  Agent,
  AgentVersion,
  Prisma,
} from "../generated/prisma/client.ts";

export interface CreateAgentInput {
  name: string;
  description?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
}

export interface CreateAgentVersionInput {
  systemInstruction: string;
  config: Prisma.InputJsonValue;
}

export interface AgentWithActiveVersion extends Agent {
  activeVersion?: AgentVersion | null;
}

export class AgentService {
  constructor(private prisma: PrismaClient) {}

  // ─── Agent CRUD ───────────────────────────────────────────────────────────

  async createAgent(
    input: CreateAgentInput,
    workspaceId: number,
    userId: number,
  ): Promise<Agent> {
    return this.prisma.agent.create({
      data: {
        name: input.name,
        description: input.description,
        workspaceId,
        createdById: userId,
        lastUpdatedById: userId,
      },
    });
  }

  async listAgents(workspaceId: number): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAgentById(
    agentId: number,
    workspaceId: number,
  ): Promise<AgentWithActiveVersion | null> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        workspaceId,
      },
    });

    if (!agent) return null;

    // If there's an active version, fetch it
    let activeVersion: AgentVersion | null = null;
    if (agent.activeAgentVersionId) {
      activeVersion = await this.prisma.agentVersion.findUnique({
        where: { id: agent.activeAgentVersionId },
      });
    }

    return { ...agent, activeVersion };
  }

  async updateAgent(
    agentId: number,
    workspaceId: number,
    input: UpdateAgentInput,
    userId: number,
  ): Promise<Agent | null> {
    // First verify the agent exists and belongs to the workspace
    const existing = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!existing) return null;

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        lastUpdatedById: userId,
      },
    });
  }

  // ─── AgentVersion CRUD ────────────────────────────────────────────────────

  async createAgentVersion(
    agentId: number,
    workspaceId: number,
    input: CreateAgentVersionInput,
    userId: number,
  ): Promise<AgentVersion | null> {
    // Verify agent exists and belongs to workspace
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!agent) return null;

    return this.prisma.agentVersion.create({
      data: {
        systemInstruction: input.systemInstruction,
        config: input.config,
        agentId,
        createdById: userId,
      },
    });
  }

  async listAgentVersions(
    agentId: number,
    workspaceId: number,
  ): Promise<AgentVersion[] | null> {
    // Verify agent exists and belongs to workspace
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!agent) return null;

    return this.prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Active Version ───────────────────────────────────────────────────────

  // if versionId is given, return that version. Otherwise return active version (if any)
  async getAgentVersion(
    agentId: number,
    workspaceId: number,
    versionId?: number,
  ): Promise<AgentVersion | null> {
    // Verify agent exists and belongs to workspace
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!agent) return null;

    if (versionId) {
      return this.prisma.agentVersion.findUnique({
        where: { id: versionId },
      });
    }

    if (!agent.activeAgentVersionId) return null;

    return this.prisma.agentVersion.findUnique({
      where: { id: agent.activeAgentVersionId },
    });
  }

  async setActiveVersion(
    agentId: number,
    workspaceId: number,
    versionId: number,
    userId: number,
  ): Promise<
    { success: true; agent: Agent } | { success: false; error: string }
  > {
    // Verify agent exists and belongs to workspace
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Verify version exists and belongs to this agent
    const version = await this.prisma.agentVersion.findFirst({
      where: { id: versionId, agentId },
    });

    if (!version) {
      return {
        success: false,
        error: "Version not found or does not belong to this agent",
      };
    }

    // Update the active version
    const updatedAgent = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        activeAgentVersionId: versionId,
        lastUpdatedById: userId,
      },
    });

    return { success: true, agent: updatedAgent };
  }

  // ─── Delete Agent ─────────────────────────────────────────────────────────

  async deleteAgent(
    agentId: number,
    workspaceId: number,
  ): Promise<{ success: true } | { success: false; error: string }> {
    // Verify agent exists and belongs to workspace
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Delete agent (cascade will handle AgentVersion, etc.)
    await this.prisma.agent.delete({
      where: { id: agentId },
    });

    return { success: true };
  }
}
