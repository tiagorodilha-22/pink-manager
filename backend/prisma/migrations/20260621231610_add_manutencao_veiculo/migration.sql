-- CreateTable
CREATE TABLE "manutencoes_veiculo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "veiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "kmRealizado" INTEGER,
    "dataRealizado" DATETIME NOT NULL,
    "kmProxima" INTEGER,
    "dataProxima" DATETIME,
    "osNumero" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manutencoes_veiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
