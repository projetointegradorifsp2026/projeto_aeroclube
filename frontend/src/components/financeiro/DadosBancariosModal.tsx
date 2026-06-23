import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAlert } from '@/components/feedback/alert-provider'
import {
  getDadosBancariosUsuario, getDadosBancariosEntidade, getDadosBancariosCliente,
  salvarDadosBancarios, emptyDadosBancarios, type DadosBancarios,
} from '@/services/cnabService'

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const soDigitos = (v: string) => v.replace(/\D/g, '')

interface Props {
  open: boolean
  onClose: () => void
  // Exatamente um dos três
  usuarioId?: string
  entidadeId?: string
  clienteId?: string
  titularNome?: string
}

export function DadosBancariosModal({ open, onClose, usuarioId, entidadeId, clienteId, titularNome }: Props) {
  const alert = useAlert()
  const [form, setForm] = useState<DadosBancarios>(emptyDadosBancarios())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setErros({})
    const loader = usuarioId
      ? getDadosBancariosUsuario(usuarioId)
      : entidadeId
        ? getDadosBancariosEntidade(entidadeId)
        : clienteId
          ? getDadosBancariosCliente(clienteId)
          : Promise.resolve(null)
    loader
      .then(d => setForm(d ?? { ...emptyDadosBancarios(), titular: titularNome ?? '' }))
      .catch(() => setForm({ ...emptyDadosBancarios(), titular: titularNome ?? '' }))
      .finally(() => setLoading(false))
  }, [open, usuarioId, entidadeId, clienteId, titularNome])

  function set<K extends keyof DadosBancarios>(k: K, v: DadosBancarios[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (form.agencia && soDigitos(form.agencia).length === 0) e.agencia = 'Agência deve conter números'
    if (form.conta && soDigitos(form.conta).length === 0) e.conta = 'Conta deve conter números'
    if (form.codigo_banco && soDigitos(form.codigo_banco).length === 0) e.codigo_banco = 'Código deve ser numérico'
    const cpfCnpj = soDigitos(form.cpf_cnpj_titular)
    if (form.cpf_cnpj_titular && cpfCnpj.length !== 11 && cpfCnpj.length !== 14)
      e.cpf_cnpj_titular = 'CPF (11) ou CNPJ (14) dígitos'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validar()) return
    setSaving(true)
    try {
      await salvarDadosBancarios({
        ...form,
        usuario: usuarioId ? parseInt(usuarioId, 10) : null,
        entidade: entidadeId ? parseInt(entidadeId, 10) : null,
        cliente: clienteId ? parseInt(clienteId, 10) : null,
      })
      alert.success('Dados bancários salvos com sucesso')
      onClose()
    } catch (err) {
      alert.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados Bancários</DialogTitle>
          <DialogDescription>
            {titularNome ? `Dados bancários de ${titularNome}.` : 'Dados bancários (opcionais).'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Banco</label>
                <Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Sicoob" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Código do Banco</label>
                <Input value={form.codigo_banco} onChange={e => set('codigo_banco', e.target.value)} placeholder="Ex: 756" />
                {erros.codigo_banco && <p className="text-xs text-destructive">{erros.codigo_banco}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_1fr] gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Agência</label>
                <Input value={form.agencia} onChange={e => set('agencia', e.target.value)} />
                {erros.agencia && <p className="text-xs text-destructive">{erros.agencia}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DV</label>
                <Input value={form.agencia_dv} onChange={e => set('agencia_dv', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Conta</label>
                <Input value={form.conta} onChange={e => set('conta', e.target.value)} />
                {erros.conta && <p className="text-xs text-destructive">{erros.conta}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DV</label>
                <Input value={form.conta_dv} onChange={e => set('conta_dv', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Conta</label>
                <select className={selectCls} value={form.tipo_conta} onChange={e => set('tipo_conta', e.target.value as DadosBancarios['tipo_conta'])}>
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Conta Poupança</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Chave Pix</label>
                <Input value={form.chave_pix} onChange={e => set('chave_pix', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Titular</label>
                <Input value={form.titular} onChange={e => set('titular', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">CPF/CNPJ do Titular</label>
                <Input value={form.cpf_cnpj_titular} onChange={e => set('cpf_cnpj_titular', e.target.value)} />
                {erros.cpf_cnpj_titular && <p className="text-xs text-destructive">{erros.cpf_cnpj_titular}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
