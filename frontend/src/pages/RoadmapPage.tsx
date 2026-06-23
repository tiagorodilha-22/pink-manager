import { useState } from 'react'
import { Map, CheckCircle2, Zap, Star, Globe, ChevronDown, ChevronUp } from 'lucide-react'

type Status = 'CONCLUIDO' | 'EM_DESENVOLVIMENTO' | 'PLANEJADO' | 'IDEIA'
type Onda   = 1 | 2 | 3 | 4

interface Item {
  id: number
  titulo: string
  descricao: string
  status: Status
  categoria: string
  complexidade: 'BAIXA' | 'MEDIA' | 'ALTA'
  notas?: string
  onda: Onda
}

const ONDAS: { onda: Onda; titulo: string; subtitulo: string; icon: React.ElementType; cor: string; bg: string; borda: string }[] = [
  { onda: 1, titulo: 'Onda 1 — Core Operacional',      subtitulo: 'Fundação do sistema: gestão de OS, financeiro básico e controle interno.',                     icon: CheckCircle2, cor: 'text-green-700',  bg: 'bg-green-50',   borda: 'border-green-200' },
  { onda: 2, titulo: 'Onda 2 — Automação e Relatórios', subtitulo: 'Reduzir trabalho manual, gerar documentos e oferecer visibilidade gerencial com dados reais.',   icon: Zap,          cor: 'text-blue-700',   bg: 'bg-blue-50',    borda: 'border-blue-200'  },
  { onda: 3, titulo: 'Onda 3 — Experiência do Cliente', subtitulo: 'O cliente passa a interagir com a oficina digitalmente: aprova orçamentos, acompanha sua OS.',  icon: Star,         cor: 'text-purple-700', bg: 'bg-purple-50',  borda: 'border-purple-200'},
  { onda: 4, titulo: 'Onda 4 — Plataforma',             subtitulo: 'Pink Manager vira plataforma: fornecedores, catálogo compartilhado e app mobile.',               icon: Globe,        cor: 'text-orange-700', bg: 'bg-orange-50',  borda: 'border-orange-200'},
]

const ITEMS: Item[] = [
  // ── Onda 1 — Core Operacional ─────────────────────────────────────────────
  { id: 1,  onda: 1, titulo: 'Clientes e Veículos',         descricao: 'CRUD de clientes com histórico de veículos.',                                        status: 'CONCLUIDO', categoria: 'Operação',   complexidade: 'MEDIA' },
  { id: 2,  onda: 1, titulo: 'Ordens de Serviço',           descricao: 'Fluxo completo: abertura, diagnóstico, orçamento, execução e encerramento.',          status: 'CONCLUIDO', categoria: 'Operação',   complexidade: 'ALTA'  },
  { id: 3,  onda: 1, titulo: 'Agendamentos',                descricao: 'Calendário de agendamentos vinculado às OS.',                                         status: 'CONCLUIDO', categoria: 'Operação',   complexidade: 'MEDIA' },
  { id: 4,  onda: 1, titulo: 'Conciliação Bancária',        descricao: 'Importação de OFX (Inter / Rede / Stone) e conciliação com pagamentos.',              status: 'CONCLUIDO', categoria: 'Financeiro', complexidade: 'ALTA'  },
  { id: 5,  onda: 1, titulo: 'Caixa e A Receber',           descricao: 'Controle de caixa diário e gestão de recebíveis.',                                   status: 'CONCLUIDO', categoria: 'Financeiro', complexidade: 'MEDIA' },
  { id: 6,  onda: 1, titulo: 'Contas a Pagar',              descricao: 'Lançamento e controle de contas com vencimento e status automático.',                 status: 'CONCLUIDO', categoria: 'Financeiro', complexidade: 'MEDIA' },
  { id: 7,  onda: 1, titulo: 'Fornecedores',                descricao: 'Cadastro de fornecedores com histórico de compras.',                                  status: 'CONCLUIDO', categoria: 'Operação',   complexidade: 'BAIXA' },
  { id: 8,  onda: 1, titulo: 'Gestão de Usuários',          descricao: 'Controle de acesso por perfil: ADMIN, RECEPCAO, TECNICO, FINANCEIRO.',                status: 'CONCLUIDO', categoria: 'Admin',      complexidade: 'MEDIA' },
  { id: 9,  onda: 1, titulo: 'Inventário de Peças',         descricao: 'Estoque com entradas/saídas, alertas de mínimo e categorização.',                     status: 'CONCLUIDO', categoria: 'Operação',   complexidade: 'MEDIA' },
  { id: 10, onda: 1, titulo: 'Agente IA — Busca de Peças',  descricao: 'Pesquisa com IA (Claude Haiku) via seletor FIPE: marca, modelo e ano.',              status: 'CONCLUIDO', categoria: 'IA',         complexidade: 'ALTA'  },

  // ── Onda 2 — Automação e Relatórios ──────────────────────────────────────
  {
    id: 11, onda: 2,
    titulo: 'Entrada de NF por Foto',
    descricao: 'Upload da nota fiscal (foto ou PDF), vinculação ao fornecedor, lançamento manual de itens e processamento automático no inventário.',
    status: 'CONCLUIDO', categoria: 'Operação', complexidade: 'ALTA',
    notas: 'Fase 1 concluída: POST /notas-fiscais, upload multipart para /foto, PUT /:id/itens, POST /:id/processar (cria/atualiza estoque + MovimentacaoEstoque). Fase 2 futura: OCR com Google Vision ou Tesseract para extração automática de itens do DANFE.',
  },
  {
    id: 12, onda: 2,
    titulo: 'Dashboard com KPIs Reais',
    descricao: 'Painéis com dados reais: OS por status, receita mensal vs. meta, ticket médio, peças mais usadas, técnico com mais OS fechadas e estoque crítico.',
    status: 'CONCLUIDO', categoria: 'Relatórios', complexidade: 'MEDIA',
    notas: 'GET /dashboard/kpis, /receita-mensal, /os-funil. Gráfico de barras recharts, funil de etapas, variação vs mês anterior.',
  },
  {
    id: 13, onda: 2,
    titulo: 'Orçamento em PDF',
    descricao: 'Gerar PDF do orçamento da OS com logo da oficina, dados do cliente/veículo, itens e totais. Envio direto por WhatsApp ou e-mail.',
    status: 'CONCLUIDO', categoria: 'Operação', complexidade: 'MEDIA',
    notas: 'Usa pdfkit no backend. GET /os/:id/pdf (download via blob), POST /os/:id/pdf/enviar (email SMTP + WhatsApp Z-API).',
  },
  {
    id: 14, onda: 2,
    titulo: 'Relatórios Financeiros',
    descricao: 'DRE simplificado (receitas x despesas por categoria), fluxo de caixa projetado e comparativo mensal. Exportação em Excel/PDF.',
    status: 'CONCLUIDO', categoria: 'Financeiro', complexidade: 'MEDIA',
    notas: 'GET /relatorios/dre?mes&ano e /dre/historico. DRE com receitas por forma de pagamento, despesas por categoria, margem. Exportação CSV. Gráfico histórico 12 meses.',
  },
  {
    id: 15, onda: 2,
    titulo: 'Checklist Digital de Recepção',
    descricao: 'Formulário de recepção do veículo com fotos de danos, nível de combustível, km e itens presentes. Geração de laudo de entrada assinado digitalmente pelo cliente via QR code.',
    status: 'CONCLUIDO', categoria: 'Operação', complexidade: 'MEDIA',
    notas: 'Formulário com 4 grupos (Documentos, Acessórios, Estado externo, Interior). Checkbox verde/vermelho por item, campo de obs para avarias. Aparece automaticamente no status RECEPCAO.',
  },

  // ── Onda 3 — Experiência do Cliente ──────────────────────────────────────
  {
    id: 16, onda: 3,
    titulo: 'Portal do Cliente',
    descricao: 'Link único por OS onde o cliente acompanha o status em tempo real, aprova orçamentos online e visualiza o histórico completo do veículo sem precisar ligar.',
    status: 'CONCLUIDO', categoria: 'Cliente', complexidade: 'ALTA',
    notas: 'Token UUID por OS. GET /portal/:token (público). POST /portal/:token/aprovar. Galeria de fotos antes/depois. Timeline de progresso. Rota /portal/:token no frontend sem autenticação.',
  },
  {
    id: 17, onda: 3,
    titulo: 'Notificações Automáticas (WhatsApp / E-mail)',
    descricao: 'Disparo automático de mensagens em eventos chave: OS aberta, orçamento enviado aguardando aprovação, veículo pronto para retirada. Integração com WhatsApp Business API ou Z-API.',
    status: 'CONCLUIDO', categoria: 'Cliente', complexidade: 'ALTA',
    notas: 'Fire-and-forget async IIFE. Z-API (send-text) + Nodemailer SMTP. Eventos: AGUARDANDO_APROVACAO (portal link), AGUARDANDO_RETIRADA, ENTREGUE (avaliação link). Variáveis: ZAPI_*, SMTP_*, FRONTEND_URL.',
  },
  {
    id: 18, onda: 3,
    titulo: 'Agendamento Online pelo Cliente',
    descricao: 'Página pública da oficina onde o cliente escolhe serviço, data e horário disponível. Gera agendamento pendente de confirmação no sistema.',
    status: 'CONCLUIDO', categoria: 'Cliente', complexidade: 'MEDIA',
    notas: 'GET /publico/config, /publico/horarios?data. POST /publico cria cliente por telefone ou vincula existente. Rota /agendar pública. Slots com bloqueio de passados (30 min buffer).',
  },
  {
    id: 19, onda: 3,
    titulo: 'Avaliação Pós-serviço',
    descricao: 'Link público gerado na OS entregue. Cliente dá nota 0–10 e comentário sem precisar se cadastrar. Painel NPS com promotores, neutros, detratores e gráfico de distribuição.',
    status: 'CONCLUIDO', categoria: 'Cliente', complexidade: 'BAIXA',
    notas: 'POST /avaliacoes/os/:id/gerar gera token UUID. GET+POST /avaliacoes/publica/:token sem autenticação. GET /avaliacoes/resumo calcula NPS. Link /avaliar/:token acessível sem login.',
  },

  {
    id: 23, onda: 3,
    titulo: 'Fotos de Manutenção + Comprovante PDF',
    descricao: 'Upload de fotos Antes/Depois/Geral em cada manutenção do histórico do veículo. Comprovante de entrega em PDF com registro fotográfico embutido — credibilidade e veracidade para o cliente.',
    status: 'CONCLUIDO', categoria: 'Operação', complexidade: 'MEDIA',
    notas: 'Modelo FotoManutencao (ANTES/DEPOIS/GERAL). POST /manutencao/:id/foto (multipart), GET /manutencao/foto/:fotoId. GET /os/:id/comprovante gera PDF com PDFKit, fotos agrupadas por tipo de manutenção.',
  },

  // ── Onda 4 — Plataforma ───────────────────────────────────────────────────
  {
    id: 20, onda: 4,
    titulo: 'Marketplace de Fornecedores',
    descricao: 'Fornecedores de autopeças cadastram seu catálogo com preço, estoque e prazo. A busca com IA e o inventário consultam essa base real. A OS pode gerar pedido de compra direto ao fornecedor — fechando o ciclo: diagnóstico → peça encontrada → pedido → entrada no estoque.',
    status: 'IDEIA', categoria: 'Plataforma', complexidade: 'ALTA',
    notas: 'Transforma o Pink Manager em plataforma multi-tenant. Requer isolamento de dados por tenant, perfil FORNECEDOR, notificações de pedido e API pública para integração com ERPs de fornecedores.',
  },
  {
    id: 21, onda: 4,
    titulo: 'App Mobile para Técnicos',
    descricao: 'App leve (React Native) para o técnico consultar sua fila de OS, registrar apontamentos de horas, fotografar peças e atualizar status diretamente da bancada — sem precisar do computador.',
    status: 'IDEIA', categoria: 'Mobile', complexidade: 'ALTA',
  },
  {
    id: 22, onda: 4,
    titulo: 'Multi-filial',
    descricao: 'Suporte a redes de oficinas com mais de uma unidade. Cada filial tem seu estoque, caixa e equipe independente; ADMIN central tem visão consolidada.',
    status: 'IDEIA', categoria: 'Plataforma', complexidade: 'ALTA',
    notas: 'Requer adição de tenant/filialId em praticamente todos os modelos. Melhor planejar a migração junto com o Marketplace.',
  },
]

const STATUS_LABEL: Record<Status, string> = {
  CONCLUIDO: 'Concluído', EM_DESENVOLVIMENTO: 'Em dev', PLANEJADO: 'Planejado', IDEIA: 'Ideia',
}
const STATUS_COR: Record<Status, string> = {
  CONCLUIDO: 'bg-green-100 text-green-700', EM_DESENVOLVIMENTO: 'bg-orange-100 text-orange-700',
  PLANEJADO: 'bg-blue-100 text-blue-700', IDEIA: 'bg-purple-100 text-purple-700',
}
const COMPLEXIDADE_COR: Record<string, string> = {
  BAIXA: 'bg-gray-100 text-gray-500', MEDIA: 'bg-yellow-100 text-yellow-700', ALTA: 'bg-red-100 text-red-600',
}

export default function RoadmapPage() {
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([20]))
  const [ondasFechadas, setOndasFechadas] = useState<Set<Onda>>(new Set([1]))

  function toggleItem(id: number) {
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleOnda(onda: Onda) {
    setOndasFechadas(prev => { const n = new Set(prev); n.has(onda) ? n.delete(onda) : n.add(onda); return n })
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Map className="w-5 h-5 text-pink-600" />
        <h1 className="text-xl font-bold text-gray-900">Roadmap</h1>
      </div>
      <p className="text-sm text-gray-400 mb-8">Planejamento de entregas por ondas. Cada onda tem foco e valor de negócio definidos.</p>

      <div className="space-y-6">
        {ONDAS.map(({ onda, titulo, subtitulo, icon: Icon, cor, bg, borda }) => {
          const itens     = ITEMS.filter(i => i.onda === onda)
          const concluidos = itens.filter(i => i.status === 'CONCLUIDO').length
          const fechada   = ondasFechadas.has(onda)

          return (
            <div key={onda} className={`rounded-xl border ${borda} overflow-hidden`}>
              {/* Cabeçalho da onda */}
              <button
                className={`w-full flex items-center gap-3 px-5 py-4 ${bg} text-left`}
                onClick={() => toggleOnda(onda)}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${cor}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${cor}`}>{titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-600">{concluidos}/{itens.length}</p>
                    <p className="text-xs text-gray-400">entregues</p>
                  </div>
                  {/* barra de progresso */}
                  <div className="w-20 h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${onda === 1 ? 'bg-green-500' : onda === 2 ? 'bg-blue-500' : onda === 3 ? 'bg-purple-500' : 'bg-orange-500'}`}
                      style={{ width: `${(concluidos / itens.length) * 100}%` }}
                    />
                  </div>
                  {fechada ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Itens da onda */}
              {!fechada && (
                <div className="divide-y divide-gray-50 bg-white">
                  {itens.map(item => {
                    const aberto = expandidos.has(item.id)
                    return (
                      <div key={item.id}>
                        <button
                          className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{item.titulo}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMPLEXIDADE_COR[item.complexidade]}`}>{item.complexidade}</span>
                              <span className="text-xs text-gray-400">{item.categoria}</span>
                            </div>
                            {!aberto && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{item.descricao}</p>
                            )}
                          </div>
                          <span className="text-gray-300 text-xs mt-1 flex-shrink-0">{aberto ? '▲' : '▼'}</span>
                        </button>
                        {aberto && (
                          <div className="px-5 pb-4 pl-5 space-y-2 bg-gray-50/50">
                            <p className="text-sm text-gray-600 leading-relaxed">{item.descricao}</p>
                            {item.notas && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-amber-700 leading-relaxed">
                                  <span className="font-semibold">Notas técnicas: </span>{item.notas}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
