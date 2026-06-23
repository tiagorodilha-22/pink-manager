-- CreateTable
CREATE TABLE "inventario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "codigoFabricante" TEXT,
    "codigoBarras" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'OUTROS',
    "marca" TEXT,
    "compatibilidade" TEXT,
    "descricao" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "qtdMinima" INTEGER NOT NULL DEFAULT 1,
    "custoUnitario" DECIMAL NOT NULL DEFAULT 0,
    "precoVenda" DECIMAL NOT NULL DEFAULT 0,
    "localizacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "osId" TEXT,
    "custo" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimentacoes_estoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
