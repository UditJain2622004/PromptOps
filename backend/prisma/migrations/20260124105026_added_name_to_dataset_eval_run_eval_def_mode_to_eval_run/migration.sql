-- CreateEnum
CREATE TYPE "EvaluationRunMode" AS ENUM ('CHAT', 'AGENTIC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EvaluationRunStatus" ADD VALUE 'FAILED';
ALTER TYPE "EvaluationRunStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "EvaluationRunStatus" ADD VALUE 'TIMED_OUT';

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "EvaluationDefinition" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "EvaluationRun" ADD COLUMN     "mode" "EvaluationRunMode" NOT NULL DEFAULT 'CHAT',
ADD COLUMN     "name" TEXT;
