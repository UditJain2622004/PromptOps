/*
  Warnings:

  - You are about to drop the column `result` on the `EvaluationResult` table. All the data in the column will be lost.
  - Added the required column `parameters` to the `EvaluationDefinition` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `EvaluationDefinition` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `passed` to the `EvaluationResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EvaluationDefinition" ADD COLUMN     "parameters" JSONB NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EvaluationResult" DROP COLUMN "result",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "passed" BOOLEAN NOT NULL;
