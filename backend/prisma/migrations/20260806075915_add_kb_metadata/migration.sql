-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

-- AlterTable
ALTER TABLE "KnowledgeBase" ADD COLUMN     "color" VARCHAR(30) NOT NULL DEFAULT 'blue',
ADD COLUMN     "icon" VARCHAR(40) NOT NULL DEFAULT 'book-open',
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
