-- CreateTable
CREATE TABLE "notas_fiscais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "serie" TEXT,
    "fornecedorId" TEXT,
    "dataEmissao" DATETIME NOT NULL,
    "valorTotal" DECIMAL NOT NULL DEFAULT 0,
    "fotoPath" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notas_fiscais_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "itens_nota_fiscal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notaFiscalId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "valorUnitario" DECIMAL NOT NULL,
    "codigoFabricante" TEXT,
    "itemInventarioId" TEXT,
    CONSTRAINT "itens_nota_fiscal_notaFiscalId_fkey" FOREIGN KEY ("notaFiscalId") REFERENCES "notas_fiscais" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "itens_nota_fiscal_itemInventarioId_fkey" FOREIGN KEY ("itemInventarioId") REFERENCES "inventario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
