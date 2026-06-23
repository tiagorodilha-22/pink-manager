-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cor" TEXT,
    "km" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veiculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "queixa" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "queixa" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEPCAO',
    "valorTotal" DECIMAL NOT NULL DEFAULT 0,
    "valorPago" DECIMAL NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "dataEntrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevista" DATETIME,
    "dataEntrega" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ordens_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ordens_servico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checklist_itens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor" BOOLEAN NOT NULL,
    "obs" TEXT,
    CONSTRAINT "checklist_itens_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "diagnosticos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tecnicoNome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnosticos_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "valorPecas" DECIMAL NOT NULL DEFAULT 0,
    "valorMO" DECIMAL NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL NOT NULL DEFAULT 0,
    "prazoEntrega" DATETIME,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orcamentos_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "itens_orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orcamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "valorUnit" DECIMAL NOT NULL,
    "valorTotal" DECIMAL NOT NULL,
    "fornecedorId" TEXT,
    CONSTRAINT "itens_orcamento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "itens_orcamento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "itens_os" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "valorUnit" DECIMAL NOT NULL,
    "valorTotal" DECIMAL NOT NULL,
    CONSTRAINT "itens_os_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "historico_os" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "statusAntes" TEXT,
    "statusDepois" TEXT NOT NULL,
    "obs" TEXT,
    "usuarioNome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historico_os_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "adquirente" TEXT,
    "nsu" TEXT,
    "valor" DECIMAL NOT NULL,
    "qtdParcelas" INTEGER NOT NULL DEFAULT 1,
    "statusConcil" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parcelas_receber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pagamentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL NOT NULL,
    "dataPrevista" DATETIME NOT NULL,
    "dataRecebida" DATETIME,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "lancamentoId" TEXT,
    CONSTRAINT "parcelas_receber_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parcelas_receber_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos_extrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lancamentos_extrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origem" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "nsuRef" TEXT,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "importadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashUnico" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "conciliacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pagamentoId" TEXT NOT NULL,
    "lancamentoId" TEXT NOT NULL,
    "valorConcil" DECIMAL NOT NULL,
    "tipoMatch" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conciliacoes_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conciliacoes_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos_extrato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lancamentos_caixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "osId" TEXT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpfCnpj_key" ON "clientes"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_agendamentoId_key" ON "ordens_servico"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosticos_osId_key" ON "diagnosticos"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_osId_key" ON "orcamentos"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_extrato_hashUnico_key" ON "lancamentos_extrato"("hashUnico");
