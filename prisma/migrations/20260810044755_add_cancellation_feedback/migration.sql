-- CreateTable
CREATE TABLE "CancellationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionContractId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalFeedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CancellationFeedback_subscriptionContractId_idx" ON "CancellationFeedback"("subscriptionContractId");
