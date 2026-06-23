/**
 * Abstração de armazenamento de arquivos.
 * Quando GCS_BUCKET está definido usa Google Cloud Storage; caso contrário usa disco local.
 * As rotas não precisam conhecer onde os arquivos estão guardados.
 */
import { writeFile, readFile, unlink } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const BUCKET     = process.env.GCS_BUCKET ?? ''
const LOCAL_DIR  = join(process.cwd(), 'uploads')

if (!BUCKET && !existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true })

// Lazy-load do SDK — só instancia se GCS_BUCKET estiver configurado
let _gcs: import('@google-cloud/storage').Storage | null = null
async function gcs() {
  if (!_gcs) {
    const { Storage } = await import('@google-cloud/storage')
    _gcs = new Storage()
  }
  return _gcs
}

/** Salva um arquivo (buffer) no storage configurado. */
export async function storeFile(filename: string, buffer: Buffer): Promise<void> {
  if (BUCKET) {
    const g = await gcs()
    await g.bucket(BUCKET).file(filename).save(buffer, { resumable: false })
  } else {
    await writeFile(join(LOCAL_DIR, filename), buffer)
  }
}

/** Remove um arquivo. Silencia erros de "não encontrado". */
export async function removeFile(filename: string): Promise<void> {
  if (BUCKET) {
    const g = await gcs()
    await g.bucket(BUCKET).file(filename).delete({ ignoreNotFound: true })
  } else {
    try { await unlink(join(LOCAL_DIR, filename)) } catch { /* já removido */ }
  }
}

/** Lê o conteúdo de um arquivo como Buffer (usado na geração de PDF). */
export async function fetchFile(filename: string): Promise<Buffer> {
  if (BUCKET) {
    const g = await gcs()
    const [buffer] = await g.bucket(BUCKET).file(filename).download()
    return buffer
  }
  return readFile(join(LOCAL_DIR, filename))
}

/**
 * Retorna a URL pública de um arquivo.
 * No GCS: URL pública do bucket (o bucket precisa ser público ou usar signed URLs).
 * Local: null — a rota de serve deve ser usada.
 */
export function publicUrl(filename: string): string | null {
  if (BUCKET) return `https://storage.googleapis.com/${BUCKET}/${filename}`
  return null
}

/** Verifica existência local (em modo GCS sempre retorna true). */
export function fileExists(filename: string): boolean {
  if (BUCKET) return true
  return existsSync(join(LOCAL_DIR, filename))
}
