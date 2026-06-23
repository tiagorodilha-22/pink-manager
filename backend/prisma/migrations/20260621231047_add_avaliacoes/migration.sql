-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT,
    "respondidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avaliacoes_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_osId_key" ON "avaliacoes"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_token_key" ON "avaliacoes"("token");
