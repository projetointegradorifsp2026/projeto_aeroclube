import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmarResetSenha } from '@/services/passwordService'

export default function ResetarSenha() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const linkInvalido = !uid || !token

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return }
    if (novaSenha !== confirmar) { setErro('A confirmação não confere com a nova senha.'); return }
    setLoading(true)
    try {
      await confirmarResetSenha(uid, token, novaSenha)
      setSucesso(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir a senha.'
      try { setErro(JSON.parse(msg).detail ?? msg) } catch { setErro(msg) }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#422974] to-[#7756B9] text-foreground px-4">
      <div className="w-full max-w-md rounded-4xl border border-border bg-card text-card-foreground shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/logo_icon.svg" alt="Logo" className="w-[120px]" />
          <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
        </div>

        {linkInvalido ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Link inválido. Solicite uma nova redefinição de senha.</p>
            <Button className="w-full h-10" onClick={() => navigate('/')}>Voltar ao login</Button>
          </div>
        ) : sucesso ? (
          <p className="py-4 text-center text-sm text-emerald-600 font-medium">
            Senha redefinida com sucesso! Redirecionando para o login...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova senha</label>
              <Input type="password" className="bg-background h-10" value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input type="password" className="bg-background h-10" value={confirmar}
                onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </Button>
            <Button type="button" variant="outline" className="w-full h-10" onClick={() => navigate('/')}>
              Voltar ao login
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
