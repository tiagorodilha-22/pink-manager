-- CreateTable
CREATE TABLE "fotos_manutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manutencaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'GERAL',
    "filename" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fotos_manutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "manutencoes_veiculo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
