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
import {
  type TituloPagar,
  type TituloPagarTipo,
  TITULO_PAGAR_TIPO_LABELS,
  ALL_TITULO_PAGAR_TIPOS,
} from '@/mocks/titulos'
import { cn } from '@/lib/utils'

export interface TituloPagarFormData {
  tipo: TituloPagarTipo
  favorecido: string
  descricao: string
  total_parcelas: number
  valor: number
  data_emissao: string
  parcela_vencimentos: string[]
  recorrente: boolean
}

interface TituloPagarFormModalProps {
  titulo?: TituloPagar | null
  open: boolean
  onClose: () => void
  onSave: (data: TituloPagarFormData) => Promise<void>
  onDeleteRequest?: () => void
}

const todayStr = () => new Date().toISOString().split('T')[0]

function makeEmptyForm(): TituloPagarFormData {
  return {
    tipo: 'fornecedor',
    favorecido: '',
    descricao: '',
    total_parcelas: 1,
    valor: 0,
    data_emissao: todayStr(),
    parcela_vencimentos: [''],
    recorrente: false,
  }
}

type FormErrors = {
  favorecido?: string
  descricao?: string
  valor?: string
  data_emissao?: string
  parcela_vencimentos?: string
}

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const dateCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

export function TituloPagarFormModal({
  titulo,
  open,
  onClose,
  onSave,
  onDeleteRequest,
}: TituloPagarFormModalProps) {
  const [form, setForm] = useState<TituloPagarFormData>(makeEmptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!titulo

  useEffect(() => {
    if (open) {
      setForm(
        titulo
          ? {
              tipo: titulo.tipo,
              favorecido: titulo.favorecido,
              descricao: titulo.descricao,
              total_parcelas: 1,
              valor: titulo.valor,
              data_emissao: titulo.data_emissao,
              parcela_vencimentos: [titulo.data_vencimento],
              recorrente: titulo.recorrente,
            }
          : makeEmptyForm(),
      )
      setErrors({})
    }
  }, [titulo, open])

  function handleTotalParcelasChange(val: number) {
    const n = Math.max(1, Math.min(24, val || 1))
    setForm(prev => ({
      ...prev,
      total_parcelas: n,
      parcela_vencimentos: Array.from({ length: n }, (_, i) => prev.parcela_vencimentos[i] ?? ''),
    }))
  }

  function setVencimento(i: number, value: string) {
    setForm(prev => {
      const arr = [...prev.parcela_vencimentos]
      arr[i] = value
      return { ...prev, parcela_vencimentos: arr }
    })
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.favorecido.trim()) e.favorecido = 'Favorecido é obrigatório'
    if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória'
    if (!form.valor || form.valor <= 0) e.valor = 'Valor deve ser maior que zero'
    if (!form.data_emissao) e.data_emissao = 'Data de emissão é obrigatória'
    if (form.parcela_vencimentos.some(d => !d))
      e.parcela_vencimentos =
        form.total_parcelas === 1
          ? 'Data de vencimento é obrigatória'
          : 'Preencha o vencimento de todas as parcelas'
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
          <DialogTitle>
            {isEdit ? 'Editar Título a Pagar' : 'Novo Título a Pagar'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do título.'
              : 'Preencha os dados para cadastrar um novo título a pagar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tipo + Favorecido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select
                className={selectCls}
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TituloPagarTipo }))}
              >
                {ALL_TITULO_PAGAR_TIPOS.map(t => (
                  <option key={t} value={t}>
                    {TITULO_PAGAR_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
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

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Descrição do título"
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              hasError={!!errors.descricao}
              helper={errors.descricao}
            />
          </div>

          {/* Valor + Emissão + Total parcelas */}
          <div className={cn('grid gap-3', isEdit ? 'grid-cols-2' : 'grid-cols-3')}>
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
              <label className="text-sm font-medium">Data de emissão</label>
              <input
                type="date"
                className={dateCls}
                value={form.data_emissao}
                onChange={e => setForm(p => ({ ...p, data_emissao: e.target.value }))}
              />
              {errors.data_emissao && (
                <p className="text-xs text-destructive">{errors.data_emissao}</p>
              )}
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nº de parcelas</label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={form.total_parcelas}
                  onChange={e => handleTotalParcelasChange(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Vencimentos por parcela */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {form.total_parcelas === 1 ? 'Data de vencimento' : 'Vencimentos por parcela'}
            </label>
            {form.total_parcelas === 1 ? (
              <input
                type="date"
                className={dateCls}
                value={form.parcela_vencimentos[0] ?? ''}
                onChange={e => setVencimento(0, e.target.value)}
              />
            ) : (
              <div className="space-y-2">
                {Array.from({ length: form.total_parcelas }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      Parcela {i + 1}
                    </span>
                    <input
                      type="date"
                      className={cn(dateCls, 'flex-1')}
                      value={form.parcela_vencimentos[i] ?? ''}
                      onChange={e => setVencimento(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
            {errors.parcela_vencimentos && (
              <p className="text-xs text-destructive">{errors.parcela_vencimentos}</p>
            )}
          </div>

          {/* Recorrente */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.recorrente}
              onChange={e => setForm(p => ({ ...p, recorrente: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Título recorrente</span>
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
