import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { alterarMinhaSenha } from '@/services/passwordService'

interface Props {
  open: boolean
  onClose: () => void
}

export function AlterarSenhaModal({ open, onClose }: Props) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (open) {
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
      setErro(''); setSucesso(false)
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return }
    if (novaSenha !== confirmar) { setErro('A confirmação não confere com a nova senha.'); return }
    setSaving(true)
    try {
      await alterarMinhaSenha(senhaAtual, novaSenha)
      setSucesso(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar a senha.'
      // Mensagem do backend vem como JSON {"detail": "..."}
      try { setErro(JSON.parse(msg).detail ?? msg) } catch { setErro(msg) }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Informe sua senha atual e escolha uma nova senha.</DialogDescription>
        </DialogHeader>

        {sucesso ? (
          <p className="py-6 text-center text-sm text-emerald-600 font-medium">Senha alterada com sucesso!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha atual</label>
              <Input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nova senha</label>
              <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Alterar senha'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
