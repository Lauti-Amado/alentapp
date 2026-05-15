-- CreateEnum
CREATE TYPE "LockerStatus" AS ENUM ('Disponible', 'Ocupado', 'Mantenimiento');

-- CreateTable
CREATE TABLE "lockers" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "LockerStatus" NOT NULL DEFAULT 'Disponible',
    "ubicacion" TEXT NOT NULL,
    "member_id" TEXT,

    CONSTRAINT "lockers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lockers_numero_key" ON "lockers"("numero");

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
