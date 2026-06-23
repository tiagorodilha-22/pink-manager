import PDFDocument from 'pdfkit'

export interface FotoParaPDF {
  id: string
  tipo: string
  filename: string
  buffer: Buffer
  manutencaoTipo: string
}

const PINK  = '#e91e8c'
const DARK  = '#111827'
const GRAY  = '#6b7280'
const LGRAY = '#9ca3af'
const LBG   = '#f9fafb'
const BORD  = '#e5e7eb'

const fmt   = (v: unknown) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const ORDER_TIPO: Record<string, number> = { PECA: 0, MAO_OBRA: 1, OUTROS: 2 }
const fmtDt = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR')
const padOS = (n: number) => `OS-${String(n).padStart(4, '0')}`

export interface OSParaPDF {
  numero: number
  queixa: string
  dataEntrada: Date
  observacoes: string | null
  veiculo: {
    marca: string
    modelo: string
    ano: number
    placa: string
    km: number | null
    cor: string | null
    cliente: {
      nome: string
      telefone: string
      email: string | null
      cpfCnpj: string | null
    }
  }
  orcamento: {
    valorPecas: unknown
    valorMO: unknown
    valorTotal: unknown
    prazoEntrega: Date | null
    observacoes: string | null
    itens: Array<{
      tipo: string
      descricao: string
      quantidade: unknown
      valorUnit: unknown
      valorTotal: unknown
    }>
  }
}

export function gerarOrcamentoPDF(os: OSParaPDF, nomeOficina: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: { Title: `Orcamento ${padOS(os.numero)}`, Author: nomeOficina, Creator: 'Pink Manager' },
    })

    const chunks: Buffer[] = []
    doc.on('data',  c => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W  = 515  // 595 - 40 - 40
    const LM = 40

    // ── Header ─────────────────────────────────────────────────
    doc.rect(LM, 40, W, 54).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(20)
       .text(nomeOficina, LM + 14, 52, { width: 310 })
    doc.font('Helvetica').fontSize(9)
       .text(`Orçamento ${padOS(os.numero)}`, LM + 14, 78)
       .text(`Emitido em: ${fmtDt(os.dataEntrada)}`, LM + 360, 78, { width: 141, align: 'right' })

    // ── Cliente + Veiculo ──────────────────────────────────────
    let y = 110
    const bW = (W - 12) / 2
    const x2 = LM + bW + 12

    // Cliente — cabecalho
    doc.rect(LM, y, bW, 15).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('CLIENTE', LM + 8, y + 4)
    // Cliente — corpo
    doc.rect(LM, y + 15, bW, 72).strokeColor(BORD).lineWidth(0.5).stroke()
    const cl = os.veiculo.cliente
    let cy = y + 21
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(cl.nome, LM + 8, cy, { width: bW - 16 })
    cy += 14
    doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(`Tel: ${cl.telefone}`, LM + 8, cy); cy += 12
    if (cl.email)   { doc.text(`E-mail: ${cl.email}`,     LM + 8, cy); cy += 12 }
    if (cl.cpfCnpj) { doc.text(`CPF/CNPJ: ${cl.cpfCnpj}`, LM + 8, cy) }

    // Veiculo — cabecalho
    doc.rect(x2, y, bW, 15).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('VE\xcdCULO', x2 + 8, y + 4)
    // Veiculo — corpo
    doc.rect(x2, y + 15, bW, 72).strokeColor(BORD).lineWidth(0.5).stroke()
    const vei = os.veiculo
    let vy = y + 21
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
       .text(`${vei.marca} ${vei.modelo}`, x2 + 8, vy, { width: bW - 16 })
    vy = doc.y + 3
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
       .text(`Ano: ${vei.ano}   Placa: ${vei.placa}`, x2 + 8, vy); vy += 12
    if (vei.km)  { doc.text(`KM entrada: ${vei.km.toLocaleString('pt-BR')} km`, x2 + 8, vy); vy += 12 }
    if (vei.cor) { doc.text(`Cor: ${vei.cor}`, x2 + 8, vy) }

    // ── Queixa ─────────────────────────────────────────────────
    y = 200
    doc.fillColor(PINK).font('Helvetica-Bold').fontSize(8).text('QUEIXA / PROBLEMA RELATADO', LM, y)
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(os.queixa, LM, y + 11, { width: W })

    // ── Tabela ─────────────────────────────────────────────────
    y = 236

    const C = { tipo: LM, desc: LM + 54, qtd: LM + 330, unit: LM + 378, tot: LM + 432 }
    const CW = { tipo: 50, desc: 272, qtd: 44, unit: 50, tot: 83 }

    // Cabecalho tabela
    doc.rect(LM, y, W, 15).fill(DARK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
       .text('TIPO',       C.tipo + 4, y + 4, { width: CW.tipo })
       .text('DESCRI\xc7\xc3O', C.desc + 4, y + 4, { width: CW.desc })
       .text('QTD',  C.qtd,  y + 4, { width: CW.qtd,  align: 'right' })
       .text('UNIT.', C.unit, y + 4, { width: CW.unit, align: 'right' })
       .text('TOTAL', C.tot,  y + 4, { width: CW.tot,  align: 'right' })
    y += 17

    const itensSorted = [...os.orcamento.itens].sort((a, b) => (ORDER_TIPO[a.tipo] ?? 2) - (ORDER_TIPO[b.tipo] ?? 2))
    itensSorted.forEach((item, i) => {
      const rH = 15
      if (i % 2 === 0) doc.rect(LM, y, W, rH).fill(LBG)
      const tipoLabel = item.tipo === 'PECA' ? 'Pe\xe7a' : item.tipo === 'MAO_OBRA' ? 'M.O.' : 'Outros'
      doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
         .text(tipoLabel, C.tipo + 4, y + 3, { width: CW.tipo })
      doc.fillColor(DARK)
         .text(item.descricao, C.desc + 4, y + 3, { width: CW.desc - 4 })
      doc.fillColor(GRAY)
         .text(String(Number(item.quantidade)), C.qtd,  y + 3, { width: CW.qtd,  align: 'right' })
         .text(fmt(item.valorUnit),              C.unit, y + 3, { width: CW.unit, align: 'right' })
      doc.fillColor(DARK).font('Helvetica-Bold')
         .text(fmt(item.valorTotal), C.tot, y + 3, { width: CW.tot, align: 'right' })
      y += rH
    })

    doc.rect(LM, y, W, 0.5).fill(BORD)
    y += 10

    // ── Totais ─────────────────────────────────────────────────
    const totX = LM + W - 200

    if (Number(os.orcamento.valorPecas) > 0) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(9)
         .text('Subtotal Pe\xe7as:', totX, y, { width: 110 })
      doc.fillColor(DARK).text(fmt(os.orcamento.valorPecas), totX + 115, y, { width: 85, align: 'right' })
      y += 14
    }
    if (Number(os.orcamento.valorMO) > 0) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(9)
         .text('Subtotal M\xe3o de Obra:', totX, y, { width: 115 })
      doc.fillColor(DARK).text(fmt(os.orcamento.valorMO), totX + 115, y, { width: 85, align: 'right' })
      y += 14
    }

    y += 4
    doc.rect(totX, y, 200, 24).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
       .text('TOTAL:', totX + 8, y + 7)
       .text(fmt(os.orcamento.valorTotal), totX + 8, y + 7, { width: 184, align: 'right' })
    y += 34

    if (os.orcamento.prazoEntrega) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(9)
         .text(`Prazo estimado de entrega: ${fmtDt(os.orcamento.prazoEntrega)}`, LM, y)
      y += 14
    }
    if (os.orcamento.observacoes) {
      doc.fillColor(PINK).font('Helvetica-Bold').fontSize(8).text('OBSERVA\xc7\xd5ES:', LM, y)
      y += 11
      doc.fillColor(DARK).font('Helvetica').fontSize(9)
         .text(os.orcamento.observacoes, LM, y, { width: W })
    }

    // ── Rodape ─────────────────────────────────────────────────
    const fY = 782
    doc.rect(LM, fY, W, 0.5).fill(BORD)
    doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
       .text(
         `${nomeOficina}  |  Or\xe7amento v\xe1lido por 7 dias  |  Gerado em ${fmtDt(new Date())}`,
         LM, fY + 5, { width: W, align: 'center' },
       )

    doc.end()
  })
}

// ─── Comprovante de Entrega ───────────────────────────────────────────────────

export interface ComprovanteOS {
  numero: number
  queixa: string
  dataEntrada: Date
  dataEntrega?: Date | null
  observacoes: string | null
  veiculo: {
    marca: string; modelo: string; ano: number; placa: string; km: number | null; cor: string | null
    cliente: { nome: string; telefone: string; email: string | null; cpfCnpj: string | null }
  }
  orcamento?: {
    valorTotal: unknown
    itens: Array<{ tipo: string; descricao: string; quantidade: unknown; valorUnit: unknown; valorTotal: unknown }>
  } | null
  itens?: Array<{ tipo: string; descricao: string; quantidade: unknown; valorUnit: unknown; valorTotal: unknown }>
}

const TIPO_FOTO_LABEL: Record<string, string> = { ANTES: 'ANTES', DEPOIS: 'DEPOIS', GERAL: 'FOTO' }

export function gerarComprovantePDF(
  os: ComprovanteOS,
  fotos: FotoParaPDF[],
  nomeOficina: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: { Title: `Comprovante ${padOS(os.numero)}`, Author: nomeOficina, Creator: 'Pink Manager' },
      autoFirstPage: true,
    })

    const chunks: Buffer[] = []
    doc.on('data',  c => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W  = 515
    const LM = 40

    // ── Header ─────────────────────────────────────────────────
    doc.rect(LM, 40, W, 54).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(20)
       .text(nomeOficina, LM + 14, 52, { width: 310 })
    doc.font('Helvetica').fontSize(9)
       .text(`Comprovante de Entrega — ${padOS(os.numero)}`, LM + 14, 78)
       .text(
         `Entrega: ${fmtDt(os.dataEntrega ?? new Date())}`,
         LM + 360, 78, { width: 141, align: 'right' },
       )

    // ── Cliente + Veículo ──────────────────────────────────────
    let y = 110
    const bW = (W - 12) / 2
    const x2 = LM + bW + 12

    doc.rect(LM, y, bW, 15).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('CLIENTE', LM + 8, y + 4)
    doc.rect(LM, y + 15, bW, 72).strokeColor(BORD).lineWidth(0.5).stroke()
    const cl = os.veiculo.cliente
    let cy = y + 21
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(cl.nome, LM + 8, cy, { width: bW - 16 }); cy += 14
    doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(`Tel: ${cl.telefone}`, LM + 8, cy); cy += 12
    if (cl.email)   { doc.text(`E-mail: ${cl.email}`,      LM + 8, cy); cy += 12 }
    if (cl.cpfCnpj) { doc.text(`CPF/CNPJ: ${cl.cpfCnpj}`, LM + 8, cy) }

    doc.rect(x2, y, bW, 15).fill(PINK)
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('VE\xcdCULO', x2 + 8, y + 4)
    doc.rect(x2, y + 15, bW, 72).strokeColor(BORD).lineWidth(0.5).stroke()
    const vei = os.veiculo
    let vy = y + 21
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
       .text(`${vei.marca} ${vei.modelo}`, x2 + 8, vy, { width: bW - 16 })
    vy = doc.y + 3
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
       .text(`Ano: ${vei.ano}   Placa: ${vei.placa}`, x2 + 8, vy); vy += 12
    if (vei.km)  { doc.text(`KM sa\xedda: ${vei.km.toLocaleString('pt-BR')} km`, x2 + 8, vy); vy += 12 }
    if (vei.cor) { doc.text(`Cor: ${vei.cor}`, x2 + 8, vy) }

    y = 200

    // ── Serviços realizados ────────────────────────────────────
    const itensList = (os.orcamento?.itens?.length ? os.orcamento.itens : (os.itens ?? []))

    if (itensList.length > 0) {
      doc.fillColor(PINK).font('Helvetica-Bold').fontSize(8).text('SERVI\xc7OS REALIZADOS', LM, y)
      y += 12

      const C = { tipo: LM, desc: LM + 54, qtd: LM + 330, unit: LM + 378, tot: LM + 432 }
      const CW = { tipo: 50, desc: 272, qtd: 44, unit: 50, tot: 83 }

      doc.rect(LM, y, W, 15).fill(DARK)
      doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
         .text('TIPO',       C.tipo + 4, y + 4, { width: CW.tipo })
         .text('DESCRI\xc7\xc3O', C.desc + 4, y + 4, { width: CW.desc })
         .text('QTD',   C.qtd,  y + 4, { width: CW.qtd,  align: 'right' })
         .text('UNIT.', C.unit, y + 4, { width: CW.unit, align: 'right' })
         .text('TOTAL', C.tot,  y + 4, { width: CW.tot,  align: 'right' })
      y += 17

      const itensSortedC = [...itensList].sort((a, b) => (ORDER_TIPO[a.tipo] ?? 2) - (ORDER_TIPO[b.tipo] ?? 2))
      itensSortedC.forEach((item, i) => {
        const rH = 15
        if (i % 2 === 0) doc.rect(LM, y, W, rH).fill(LBG)
        const tl = item.tipo === 'PECA' ? 'Pe\xe7a' : item.tipo === 'MAO_OBRA' ? 'M.O.' : 'Outros'
        doc.fillColor(LGRAY).font('Helvetica').fontSize(8).text(tl, C.tipo + 4, y + 3, { width: CW.tipo })
        doc.fillColor(DARK).text(item.descricao, C.desc + 4, y + 3, { width: CW.desc - 4 })
        doc.fillColor(GRAY)
           .text(String(Number(item.quantidade)), C.qtd,  y + 3, { width: CW.qtd,  align: 'right' })
           .text(fmt(item.valorUnit),              C.unit, y + 3, { width: CW.unit, align: 'right' })
        doc.fillColor(DARK).font('Helvetica-Bold')
           .text(fmt(item.valorTotal), C.tot, y + 3, { width: CW.tot, align: 'right' })
        y += rH
      })

      // Total
      y += 8
      if (os.orcamento?.valorTotal) {
        const totX = LM + W - 200
        doc.rect(totX, y, 200, 22).fill(PINK)
        doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
           .text('TOTAL:', totX + 8, y + 6)
           .text(fmt(os.orcamento.valorTotal), totX + 8, y + 6, { width: 184, align: 'right' })
        y += 30
      }
    }

    // ── Registro fotográfico ───────────────────────────────────
    if (fotos.length > 0) {
      const PAGE_H    = 842
      const MARGIN_B  = 40
      const SEC_HEAD  = 20
      const IMG_W     = 230
      const IMG_H     = 160
      const IMG_GAP   = 12
      const GROUP_GAP = 18
      const LABEL_H   = 14

      // Verifica se cabe na página atual ou inicia nova
      if (y + SEC_HEAD + LABEL_H + IMG_H + 20 > PAGE_H - MARGIN_B) {
        doc.addPage()
        y = 40
      }

      doc.fillColor(PINK).font('Helvetica-Bold').fontSize(8).text('REGISTRO FOTOGR\xc1FICO DO SERVI\xc7O', LM, y)
      y += SEC_HEAD

      // Agrupar fotos por manutenção
      const grupos = new Map<string, FotoParaPDF[]>()
      for (const f of fotos) {
        const key = f.manutencaoTipo
        if (!grupos.has(key)) grupos.set(key, [])
        grupos.get(key)!.push(f)
      }

      for (const [tipoManut, fotosGrupo] of grupos) {
        // Separar antes/depois/geral
        const antes  = fotosGrupo.filter(f => f.tipo === 'ANTES')
        const depois = fotosGrupo.filter(f => f.tipo === 'DEPOIS')
        const gerais = fotosGrupo.filter(f => f.tipo === 'GERAL')
        const pares: Array<[FotoParaPDF | null, FotoParaPDF | null]> = []

        const maxPares = Math.max(antes.length, depois.length)
        for (let i = 0; i < maxPares; i++) {
          pares.push([antes[i] ?? null, depois[i] ?? null])
        }
        for (const g of gerais) pares.push([g, null])

        // Título do grupo (tipo de manutenção)
        const TIPO_LABELS: Record<string, string> = {
          TROCA_OLEO: 'Troca de \xf3leo', CORREIA_DENTADA: 'Correia dentada',
          FILTRO_AR: 'Filtro de ar', FILTRO_COMBUSTIVEL: 'Filtro de combust\xedvel',
          FLUIDO_FREIO: 'Fluido de freio', VELA_IGNICAO: 'Vela de igni\xe7\xe3o',
          REVISAO_GERAL: 'Revis\xe3o geral', OUTRO: 'Outro',
        }

        for (const [esq, dir] of pares) {
          const rowH = LABEL_H + IMG_H + GROUP_GAP
          if (y + rowH > PAGE_H - MARGIN_B) { doc.addPage(); y = 40 }

          // Título do tipo de manutenção (uma vez por par)
          doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
             .text(TIPO_LABELS[tipoManut] ?? tipoManut, LM, y)
          y += LABEL_H

          const renderFoto = (foto: FotoParaPDF, x: number, label: string) => {
            try {
              doc.image(foto.buffer, x, y, { width: IMG_W, height: IMG_H, cover: [IMG_W, IMG_H] })
            } catch { /* skip unsupported format */ }
            doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
               .text(TIPO_FOTO_LABEL[label] ?? label, x, y + IMG_H + 2, { width: IMG_W, align: 'center' })
          }

          if (esq) renderFoto(esq, LM, esq.tipo)
          if (dir) renderFoto(dir, LM + IMG_W + IMG_GAP, dir.tipo)

          y += IMG_H + 14 + GROUP_GAP
        }
      }
    }

    // ── Assinatura ─────────────────────────────────────────────
    const PAGE_H = 842
    if (y + 80 > PAGE_H - 40) { doc.addPage(); y = 40 }

    y += 20
    doc.fillColor(BORD).rect(LM, y, 200, 0.5).fill(BORD)
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
       .text('Assinatura do cliente', LM, y + 5, { width: 200, align: 'center' })

    // ── Rodapé ─────────────────────────────────────────────────
    const fY = PAGE_H - 58
    doc.rect(LM, fY, W, 0.5).fill(BORD)
    doc.fillColor(LGRAY).font('Helvetica').fontSize(8)
       .text(
         `${nomeOficina}  |  Comprovante de entrega ${padOS(os.numero)}  |  Gerado em ${fmtDt(new Date())}`,
         LM, fY + 5, { width: W, align: 'center' },
       )

    doc.end()
  })
}
