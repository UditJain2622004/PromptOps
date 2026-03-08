import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client.ts";

interface PromptOpsApiKeyInsertRow {
  id: number;
  createdAt: Date;
}

interface PromptOpsApiKeyHashRow {
  hashedKey: string;
}

export interface CreatedPromptOpsApiKey {
  id: number;
  apiKey: string;
  createdAt: Date;
}

export interface PromptOpsApiKeyMetadata {
  id: number;
  createdAt: Date;
  revokedAt: Date | null;
}

const API_KEY_PREFIX = "popk";

export class ProxyApiKeyService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(workspaceId: number): Promise<CreatedPromptOpsApiKey> {
    return this.prisma.$transaction(async (tx) => {
      const [inserted] = await tx.$queryRaw<PromptOpsApiKeyInsertRow[]>`
        INSERT INTO "PromptOpsApiKey" ("workspaceId", "hashedKey")
        VALUES (${workspaceId}, ${""})
        RETURNING "id", "createdAt"
      `;

      if (!inserted) {
        throw new Error("Failed to create PromptOps API key row");
      }

      const secret = randomBytes(32).toString("base64url");
      const apiKey = `${API_KEY_PREFIX}_${inserted.id}_${secret}`;
      const hashedKey = this.hashApiKey(apiKey);

      await tx.$executeRaw`
        UPDATE "PromptOpsApiKey"
        SET "hashedKey" = ${hashedKey}
        WHERE "id" = ${inserted.id}
      `;

      return {
        id: inserted.id,
        apiKey,
        createdAt: inserted.createdAt,
      };
    });
  }

  async list(workspaceId: number): Promise<PromptOpsApiKeyMetadata[]> {
    return this.prisma.$queryRaw<PromptOpsApiKeyMetadata[]>`
      SELECT "id", "createdAt", "revokedAt"
      FROM "PromptOpsApiKey"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY "createdAt" DESC
    `;
  }

  async revoke(workspaceId: number, apiKeyId: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      UPDATE "PromptOpsApiKey"
      SET "revokedAt" = NOW()
      WHERE "id" = ${apiKeyId}
        AND "workspaceId" = ${workspaceId}
        AND "revokedAt" IS NULL
      RETURNING "id"
    `;

    return rows.length > 0;
  }

  async validate(providedKey: string): Promise<{ valid: true; workspaceId: number } | { valid: false }> {
    const parsed = this.parseApiKey(providedKey);
    if (!parsed) return { valid: false };

    const rows = await this.prisma.$queryRaw<(PromptOpsApiKeyHashRow & { workspaceId: number })[]>`
      SELECT "hashedKey", "workspaceId"
      FROM "PromptOpsApiKey"
      WHERE "id" = ${parsed.id}
        AND "revokedAt" IS NULL
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return { valid: false };

    const providedHash = this.hashApiKey(providedKey);
    const isValid = this.safeCompareHex(row.hashedKey, providedHash);
    
    if (!isValid) return { valid: false };
    
    return { valid: true, workspaceId: row.workspaceId };
  }

  private hashApiKey(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private parseApiKey(apiKey: string): { id: number } | null {
    const match = /^popk_(\d+)_([A-Za-z0-9\-_]+)$/.exec(apiKey);
    if (!match) return null;

    const id = Number.parseInt(match[1], 10);
    if (!Number.isFinite(id) || id <= 0) return null;

    return { id };
  }

  private safeCompareHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }
}
