-- AlterTable
ALTER TABLE "KnowledgeBase" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "KnowledgeBase_userId_isArchived_idx" ON "KnowledgeBase"("userId", "isArchived");
