/*
  Warnings:

  - You are about to drop the column `Nombre` on the `sports` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[Nombree]` on the table `sports` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Nombree` to the `sports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sports" DROP COLUMN "Nombre",
ADD COLUMN     "Nombree" TEXT NOT NULL,
ALTER COLUMN "Require_certificado_medico" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "sports_Nombree_key" ON "sports"("Nombree");
