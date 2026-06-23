-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fornecedores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_fornecedores" ("ativo", "contato", "email", "id", "nome", "telefone") SELECT "ativo", "contato", "email", "id", "nome", "telefone" FROM "fornecedores";
DROP TABLE "fornecedores";
ALTER TABLE "new_fornecedores" RENAME TO "fornecedores";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
