import { api } from './api'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'ADMIN' | 'RECEPCAO' | 'TECNICO' | 'FINANCEIRO'
}

export async function login(email: string, senha: string): Promise<Usuario> {
  const { data } = await api.post('/auth/login', { email, senha })
  localStorage.setItem('pm_token', data.token)
  localStorage.setItem('pm_usuario', JSON.stringify(data.usuario))
  return data.usuario
}

export function logout() {
  localStorage.removeItem('pm_token')
  localStorage.removeItem('pm_usuario')
  window.location.href = '/login'
}

export function getUsuarioAtual(): Usuario | null {
  const raw = localStorage.getItem('pm_usuario')
  return raw ? JSON.parse(raw) : null
}

export function isAutenticado(): boolean {
  return !!localStorage.getItem('pm_token')
}
