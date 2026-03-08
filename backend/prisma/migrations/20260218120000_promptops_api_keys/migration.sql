-- CreateTable
CREATE TABLE "PromptOpsApiKey" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PromptOpsApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptOpsApiKey_workspaceId_idx" ON "PromptOpsApiKey"("workspaceId");

-- CreateIndex
CREATE INDEX "PromptOpsApiKey_workspaceId_revokedAt_idx" ON "PromptOpsApiKey"("workspaceId", "revokedAt");

-- AddForeignKey
ALTER TABLE "PromptOpsApiKey" ADD CONSTRAINT "PromptOpsApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
