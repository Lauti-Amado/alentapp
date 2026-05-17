-- CreateTable
CREATE TABLE "disciplines" (
    "id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "esSuspensionTotal" BOOLEAN NOT NULL DEFAULT true,
    "motivoLevantamiento" TEXT,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
