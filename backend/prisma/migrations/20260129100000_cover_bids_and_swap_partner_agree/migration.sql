-- AlterTable
ALTER TABLE "ShiftSwapRequest" ADD COLUMN "requestedUserApprovedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "CoverBidStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CoverBid" (
    "id" TEXT NOT NULL,
    "coverRequestId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "status" "CoverBidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverBid_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoverBid" ADD CONSTRAINT "CoverBid_coverRequestId_fkey" FOREIGN KEY ("coverRequestId") REFERENCES "ShiftSwapRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverBid" ADD CONSTRAINT "CoverBid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
