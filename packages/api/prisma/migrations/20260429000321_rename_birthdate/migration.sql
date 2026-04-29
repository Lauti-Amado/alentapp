/*
  Warnings:

  - You are about to drop the column `birth_date` on the `members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "members" DROP COLUMN "birth_date",
ADD COLUMN     "birthdate" DATE;
