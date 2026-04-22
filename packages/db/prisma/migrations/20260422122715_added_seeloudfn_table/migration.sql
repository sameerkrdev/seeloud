-- CreateEnum
CREATE TYPE "SeeloudfnStatus" AS ENUM ('QUEUED', 'BUILDING', 'DEPLOYED', 'FAILED');

-- CreateTable
CREATE TABLE "SeeloudfnFunction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buildCommand" TEXT,
    "entry" TEXT NOT NULL DEFAULT 'index.js',
    "status" "SeeloudfnStatus" NOT NULL DEFAULT 'QUEUED',
    "bundleKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeeloudfnFunction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeeloudfnFunction_userId_idx" ON "SeeloudfnFunction"("userId");

-- AddForeignKey
ALTER TABLE "SeeloudfnFunction" ADD CONSTRAINT "SeeloudfnFunction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
