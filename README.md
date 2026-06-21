# Pink Manager 🔧

Sistema de gestão de oficina mecânica.

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose

## Subir o banco de dados

```bash
docker-compose up postgres -d
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

API disponível em: http://localhost:3001

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponível em: http://localhost:3000

## Criar usuário admin inicial

```bash
# Com o backend rodando:
curl -X POST http://localhost:3001/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin","email":"admin@pink.com","senha":"pink123","perfil":"ADMIN"}'
```

## Módulos

| Módulo | Rota |
|--------|------|
| Dashboard | `/dashboard` |
| Agendamentos | `/agendamentos` |
| Ordens de Serviço | `/os` |
| Clientes | `/clientes` |
| Conciliação Bancária | `/financeiro/conciliacao` |
| Extrato (OFX/CSV) | `/financeiro/extrato` |
| Caixa | `/financeiro/caixa` |
| A Receber | `/financeiro/recebiveis` |

## Importação de extratos

| Arquivo | Onde exportar |
|---------|---------------|
| Inter `.ofx` | App Inter → Extrato → Exportar OFX |
| Rede `.csv` | meupostorede.com.br → Extrato de Vendas |
| Stone `.csv` | portal.stone.com.br → Relatório de Transações |
