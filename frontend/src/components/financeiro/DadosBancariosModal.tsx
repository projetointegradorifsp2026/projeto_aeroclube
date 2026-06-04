import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getDadosBancariosUsuario, getDadosBancariosEntidade, salvarDadosBancarios,
  emptyDadosBancarios, type DadosBancarios,
} from '@/services/cnabService'

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

interface Props {
  open: boolean
  onClose: () => void
  // Exatamente um dos dois
  usuarioId?: string
  entidadeId?: string
  titularNome?: string
}

export function DadosBancariosModal({ open, onClose, usuarioId, entidadeId, titularNome }: Props) {
  const [form, setForm] = useState<DadosBancarios>(emptyDadosBancarios())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const loader = usuarioId
      ? getDadosBancariosUsuario(usuarioId)
      : entidadeId
        ? getDadosBancariosEntidade(entidadeId)
        : Promise.resolve(null)
    loader
      .then(d => setForm(d ?? { ...emptyDadosBancarios(), titular: titularNome ?? '' }))
      .catch(() => setForm({ ...emptyDadosBancarios(), titular: titularNome ?? '' }))
      .finally(() => setLoading(false))
  }, [open, usuarioId, entidadeId, titularNome])

  function set<K extends keyof DadosBancarios>(k: K, v: DadosBancarios[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await salvarDadosBancarios({
        ...form,
        usuario: usuarioId ? parseInt(usuarioId, 10) : null,
        entidade: entidadeId ? parseInt(entidadeId, 10) : null,
      })
      onClose()
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Banco</label>
                <Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Sicoob" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Código do Banco</label>
                <Input value={form.codigo_banco} onChange={e => set('codigo_banco', e.target.value)} placeholder="Ex: 756" />
              </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Agência</label>
                <Input value={form.agencia} onChange={e => set('agencia', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DV</label>
                <Input value={form.agencia_dv} onChange={e => set('agencia_dv', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Conta</label>
                <Input value={form.conta} onChange={e => set('conta', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DV</label>
                <Input value={form.conta_dv} onChange={e => set('conta_dv', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Titular</label>
                <Input value={form.titular} onChange={e => set('titular', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">CPF/CNPJ do Titular</label>
                <Input value={form.cpf_cnpj_titular} onChange={e => set('cpf_cnpj_titular', e.target.value)} />
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
