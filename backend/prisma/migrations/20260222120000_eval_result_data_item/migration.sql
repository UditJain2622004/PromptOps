-- AlterTable
ALTER TABLE "EvaluationResult" ADD COLUMN "dataItemId" INTEGER;

-- CreateIndex
CREATE INDEX "EvaluationResult_dataItemId_idx" ON "EvaluationResult"("dataItemId");

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_dataItemId_fkey" FOREIGN KEY ("dataItemId") REFERENCES "DataItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
