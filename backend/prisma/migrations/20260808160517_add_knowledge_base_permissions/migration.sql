-- CreateEnum
CREATE TYPE "KnowledgeBaseMemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "KnowledgeBaseMember" (
    "id" UUID NOT NULL,
    "kbId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "KnowledgeBaseMemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeBaseMember_kbId_idx" ON "KnowledgeBaseMember"("kbId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseMember_userId_idx" ON "KnowledgeBaseMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseMember_kbId_userId_key" ON "KnowledgeBaseMember"("kbId", "userId");

-- AddForeignKey
ALTER TABLE "KnowledgeBaseMember" ADD CONSTRAINT "KnowledgeBaseMember_kbId_fkey" FOREIGN KEY ("kbId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseMember" ADD CONSTRAINT "KnowledgeBaseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
