/*
  Warnings:

  - You are about to drop the column `Nombree` on the `sports` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[Nombre]` on the table `sports` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Nombre` to the `sports` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "sports_Nombree_key";

-- AlterTable
ALTER TABLE "sports" DROP COLUMN "Nombree",
ADD COLUMN     "Nombre" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sports_Nombre_key" ON "sports"("Nombre");
