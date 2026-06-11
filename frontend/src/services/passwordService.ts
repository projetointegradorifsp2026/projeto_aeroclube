import { apiPost } from '@/services/api/client'

/** Troca a senha do próprio usuário autenticado. */
export async function alterarMinhaSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await apiPost('/api/v1/usuarios/alterar-minha-senha/', {
    senha_atual: senhaAtual,
    nova_senha: novaSenha,
  })
}

/** Solicita o e-mail de redefinição de senha (esqueci minha senha). */
export async function solicitarResetSenha(email: string): Promise<void> {
  await apiPost('/api/v1/auth/solicitar-reset-senha/', { email })
}

/** Confirma a redefinição de senha com o token recebido por e-mail. */
export async function confirmarResetSenha(uid: string, token: string, novaSenha: string): Promise<void> {
  await apiPost('/api/v1/auth/confirmar-reset-senha/', {
    uid,
    token,
    nova_senha: novaSenha,
  })
}
