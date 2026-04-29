-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('Pleno', 'Cadete', 'Honorario');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('Activo', 'Moroso', 'Suspendido');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" "MemberCategory" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'Activo',
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_dni_key" ON "members"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
