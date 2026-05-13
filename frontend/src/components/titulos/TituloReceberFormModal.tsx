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
  type TituloReceber,
  type TituloReceberTipo,
  TITULO_RECEBER_TIPO_LABELS,
  ALL_TITULO_RECEBER_TIPOS,
} from '@/mocks/titulos'
import { cn } from '@/lib/utils'

export interface TituloReceberFormData {
  usuario_nome: string
  tipo: TituloReceberTipo
  descricao: string
  total_parcelas: number
  valor: number
  juros_aplicado: number
  data_emissao: string
  parcela_vencimentos: string[]
}

interface TituloReceberFormModalProps {
  titulo?: TituloReceber | null
  open: boolean
  onClose: () => void
  onSave: (data: TituloReceberFormData) => Promise<void>
  onDeleteRequest?: () => void
}

const todayStr = () => new Date().toISOString().split('T')[0]

function makeEmptyForm(): TituloReceberFormData {
  return {
    usuario_nome: '',
    tipo: 'mensalidade',
    descricao: '',
    total_parcelas: 1,
    valor: 0,
    juros_aplicado: 0,
    data_emissao: todayStr(),
    parcela_vencimentos: [''],
  }
}

type FormErrors = {
  usuario_nome?: string
  descricao?: string
  valor?: string
  data_emissao?: string
  parcela_vencimentos?: string
}

const selectCls =
  'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const dateCls =
  'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

export function TituloReceberFormModal({
  titulo,
  open,
  onClose,
  onSave,
  onDeleteRequest,
}: TituloReceberFormModalProps) {
  const [form, setForm] = useState<TituloReceberFormData>(makeEmptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!titulo

  useEffect(() => {
    if (open) {
      setForm(
        titulo
          ? {
              usuario_nome: titulo.usuario_nome,
              tipo: titulo.tipo,
              descricao: titulo.descricao,
              total_parcelas: 1,
              valor: titulo.valor,
              juros_aplicado: titulo.juros_aplicado,
              data_emissao: titulo.data_emissao,
              parcela_vencimentos: [titulo.data_vencimento],
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
    if (!form.usuario_nome.trim()) e.usuario_nome = 'Devedor é obrigatório'
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
            {isEdit ? 'Editar Título a Receber' : 'Novo Título a Receber'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do título.'
              : 'Preencha os dados para cadastrar um novo título a receber.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Devedor + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Devedor</label>
              <Input
                placeholder="Nome do devedor"
                value={form.usuario_nome}
                onChange={e => setForm(p => ({ ...p, usuario_nome: e.target.value }))}
                hasError={!!errors.usuario_nome}
                helper={errors.usuario_nome}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select
                className={selectCls}
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TituloReceberTipo }))}
              >
                {ALL_TITULO_RECEBER_TIPOS.map(t => (
                  <option key={t} value={t}>
                    {TITULO_RECEBER_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
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

          {/* Valor + Juros + Emissão + Parcelas */}
          <div className={cn('grid gap-3', isEdit ? 'grid-cols-3' : 'grid-cols-4')}>
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
              <label className="text-sm font-medium">Juros (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.juros_aplicado || ''}
                onChange={e =>
                  setForm(p => ({ ...p, juros_aplicado: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Emissão</label>
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
                <label className="text-sm font-medium">Nº parcelas</label>
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
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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
