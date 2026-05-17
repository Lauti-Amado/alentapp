-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "Nombre" TEXT NOT NULL,
    "Cupo_maximo" INTEGER NOT NULL,
    "Precio_adicional" DOUBLE PRECISION NOT NULL,
    "Descripcion" TEXT NOT NULL,
    "Require_certificado_medico" BOOLEAN NOT NULL,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);
