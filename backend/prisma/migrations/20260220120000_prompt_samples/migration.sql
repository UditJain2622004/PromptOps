-- CreateTable
CREATE TABLE "PromptSample" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "agentVersionId" INTEGER,
    "environment" TEXT NOT NULL,
    "providerHost" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "model" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "requestHeaders" JSONB NOT NULL,
    "requestBody" JSONB NOT NULL,
    "responseHeaders" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptSample_workspaceId_createdAt_idx" ON "PromptSample"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptSample_agentId_createdAt_idx" ON "PromptSample"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptSample_agentVersionId_createdAt_idx" ON "PromptSample"("agentVersionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PromptSample" ADD CONSTRAINT "PromptSample_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

