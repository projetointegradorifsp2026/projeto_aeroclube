import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { SearchSelect } from '@/components/ui/search-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type User } from '@/services/usersService'

export interface MovimentacaoFormData {
  usuario_id: string
  usuario_nome: string
  valor: number
  descricao: string
  data_transacao: string
  data_vencimento: string
}

interface MovimentacaoFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: MovimentacaoFormData) => Promise<void>
  usuarios: User[]
}

const dateCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const todayStr = () => new Date().toISOString().split('T')[0]

function makeEmpty(): MovimentacaoFormData {
  const today = todayStr()
  const sixMonths = new Date()
  sixMonths.setMonth(sixMonths.getMonth() + 6)
  return {
    usuario_id: '',
    usuario_nome: '',
    valor: 0,
    descricao: '',
    data_transacao: today,
    data_vencimento: sixMonths.toISOString().split('T')[0],
  }
}

type FormErrors = {
  usuario_id?: string
  valor?: string
  descricao?: string
  data_transacao?: string
  data_vencimento?: string
}

export function MovimentacaoFormModal({
  open,
  onClose,
  onSave,
  usuarios,
}: MovimentacaoFormModalProps) {
  const [form, setForm] = useState<MovimentacaoFormData>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(makeEmpty())
      setErrors({})
    }
  }, [open])

  function handleUsuarioChange(id: string) {
    const u = usuarios.find(u => u.id === id)
    setForm(p => ({ ...p, usuario_id: id, usuario_nome: u?.nome ?? '' }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.usuario_id) e.usuario_id = 'Selecione um usuário'
    if (!form.valor || form.valor <= 0) e.valor = 'Valor deve ser maior que zero'
    if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória'
    if (!form.data_transacao) e.data_transacao = 'Data da transação é obrigatória'
    if (!form.data_vencimento) e.data_vencimento = 'Data de vencimento é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const clientePerfis: Array<'aluno' | 'socio' | 'externo'> = ['aluno', 'socio', 'externo']
  const usuarioOptions = useMemo(
    () =>
      usuarios
        .filter(u => u.is_active && u.perfis.some(p => clientePerfis.includes(p as typeof clientePerfis[number])))
        .map(u => ({ value: u.id, label: u.nome })),
    [usuarios],
  )

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Crédito</DialogTitle>
          <DialogDescription>
            Registre a compra de horas antecipadas para um participante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Participante</label>
            <SearchSelect
              options={usuarioOptions}
              value={form.usuario_id}
              onChange={handleUsuarioChange}
              placeholder="Selecione o participante..."
              hasError={!!errors.usuario_id}
            />
            {errors.usuario_id && (
              <p className="text-xs text-destructive">{errors.usuario_id}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valor (R$)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              value={form.valor || ''}
              onChange={e => setForm(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
              hasError={!!errors.valor}
              helper={errors.valor}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Ex: Compra de 5h – PP-XYZ"
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              hasError={!!errors.descricao}
              helper={errors.descricao}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data da transação</label>
              <input
                type="date"
                className={dateCls}
                value={form.data_transacao}
                onChange={e => setForm(p => ({ ...p, data_transacao: e.target.value }))}
              />
              {errors.data_transacao && (
                <p className="text-xs text-destructive">{errors.data_transacao}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Validade dos créditos</label>
              <input
                type="date"
                className={dateCls}
                value={form.data_vencimento}
                onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}
              />
              {errors.data_vencimento && (
                <p className="text-xs text-destructive">{errors.data_vencimento}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar Crédito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
