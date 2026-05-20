import { useState, useEffect, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
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
import { type ContaFixa } from '@/mocks/contaFixa'

export interface ContaFixaFormData {
  nome: string
  descricao: string
  favorecido: string
  valor: number
  dia_vencimento: number
  is_active: boolean
}

interface ContaFixaFormModalProps {
  contaFixa?: ContaFixa | null
  open: boolean
  onClose: () => void
  onSave: (data: ContaFixaFormData) => Promise<void>
  onDeleteRequest?: () => void
}

function makeEmpty(): ContaFixaFormData {
  return {
    nome: '',
    descricao: '',
    favorecido: '',
    valor: 0,
    dia_vencimento: 10,
    is_active: true,
  }
}

type FormErrors = {
  nome?: string
  favorecido?: string
  valor?: string
  dia_vencimento?: string
}

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

export function ContaFixaFormModal({
  contaFixa,
  open,
  onClose,
  onSave,
  onDeleteRequest,
}: ContaFixaFormModalProps) {
  const [form, setForm] = useState<ContaFixaFormData>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!contaFixa

  useEffect(() => {
    if (open) {
      setForm(
        contaFixa
          ? {
              nome: contaFixa.nome,
              descricao: contaFixa.descricao,
              favorecido: contaFixa.favorecido,
              valor: contaFixa.valor,
              dia_vencimento: contaFixa.dia_vencimento,
              is_active: contaFixa.is_active,
            }
          : makeEmpty(),
      )
      setErrors({})
    }
  }, [contaFixa, open])

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.favorecido.trim()) e.favorecido = 'Favorecido é obrigatório'
    if (!form.valor || form.valor <= 0) e.valor = 'Valor deve ser maior que zero'
    if (form.dia_vencimento < 1 || form.dia_vencimento > 31) e.dia_vencimento = 'Dia inválido (1–31)'
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

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados da conta fixa recorrente.'
              : 'Cadastre uma nova conta de cobrança recorrente mensal.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Ex: Energia Elétrica"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                hasError={!!errors.nome}
                helper={errors.nome}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Favorecido</label>
              <Input
                placeholder="Nome do favorecido"
                value={form.favorecido}
                onChange={e => setForm(p => ({ ...p, favorecido: e.target.value }))}
                hasError={!!errors.favorecido}
                helper={errors.favorecido}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Descrição detalhada da despesa"
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor mensal (R$)</label>
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
              <label className="text-sm font-medium">Dia de vencimento</label>
              <select
                className={selectCls}
                value={form.dia_vencimento}
                onChange={e => setForm(p => ({ ...p, dia_vencimento: Number(e.target.value) }))}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
              {errors.dia_vencimento && (
                <p className="text-xs text-destructive">{errors.dia_vencimento}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Conta ativa (gera título mensalmente)</span>
          </label>

          <DialogFooter>
            <div className="flex w-full items-center gap-2">
              {isEdit && onDeleteRequest && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={onDeleteRequest}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
