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
import { SearchSelect } from '@/components/ui/search-select'
import {
  type TituloPagar,
  type TituloPagarTipo,
  TITULO_PAGAR_TIPO_LABELS,
  ALL_TITULO_PAGAR_TIPOS,
} from '@/mocks/titulos'
import { getContasFixas, type ContaFixa } from '@/services/contaFixaService'
import { getEntidades, type Entidade } from '@/services/entidadesService'
import { getUsers, type User, type UserProfile } from '@/services/usersService'
import { cn } from '@/lib/utils'

export interface TituloPagarFormData {
  tipo: TituloPagarTipo
  favorecido: string
  descricao: string
  total_parcelas: number
  valor: number
  multa: number
  data_emissao: string
  parcela_vencimentos: string[]
  parcela_valores: number[]
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

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function distributeValor(total: number, count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [total]
  // Prefer whole-number distribution when total is an integer
  const totalRounded = Math.round(total)
  if (Math.abs(total - totalRounded) < 0.005) {
    const base = Math.floor(totalRounded / count)
    const remainder = totalRounded - base * count
    return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base))
  }
  // Fall back to cent-level distribution
  const totalCents = Math.round(total * 100)
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base) / 100)
}

function makeEmptyForm(): TituloPagarFormData {
  const hoje = todayStr()
  return {
    tipo: 'fornecedor',
    favorecido: '',
    descricao: '',
    total_parcelas: 1,
    valor: 0,
    multa: 0,
    data_emissao: hoje,
    parcela_vencimentos: [addMonths(hoje, 1)],
    parcela_valores: [0],
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
  const [selectedContaFixaId, setSelectedContaFixaId] = useState('')
  const [fornecedores, setFornecedores] = useState<Entidade[]>([])
  const [instrutores, setInstrutores] = useState<User[]>([])
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([])
  const isEdit = !!titulo

  useEffect(() => {
    if (open) {
      Promise.all([
        getEntidades('fornecedor'),
        getUsers(),
        getContasFixas(),
      ]).then(([f, us, cfs]) => {
        setFornecedores(f.filter(e => e.is_active))
        setInstrutores(us.filter(u =>
          u.is_active &&
          (u.perfis.includes('instrutor' as UserProfile) || u.perfis.includes('funcionario' as UserProfile)),
        ))
        setContasFixas(cfs.filter(cf => cf.is_active))
      }).catch(() => {})
    }
  }, [open])

  const isTituloAtrasado =
    titulo?.status === 'em_aberto' &&
    new Date((titulo?.data_vencimento ?? '') + 'T00:00:00') < new Date()
  const showMultaField = isEdit && (titulo?.status === 'baixado' || isTituloAtrasado)

  useEffect(() => {
    if (open) {
      if (titulo) {
        setForm({
          tipo: titulo.tipo,
          favorecido: titulo.favorecido,
          descricao: titulo.descricao,
          total_parcelas: 1,
          valor: titulo.valor,
          multa: titulo.multa,
          data_emissao: titulo.data_emissao,
          parcela_vencimentos: [titulo.data_vencimento],
          parcela_valores: [titulo.valor],
          recorrente: titulo.recorrente,
        })
        if (titulo.tipo === 'conta_fixa') {
          const cf = contasFixas.find(c => c.favorecido === titulo.favorecido)
          setSelectedContaFixaId(cf?.id ?? '')
        } else {
          setSelectedContaFixaId('')
        }
      } else {
        setForm(makeEmptyForm())
        setSelectedContaFixaId('')
      }
      setErrors({})
    }
  }, [titulo, open])

  function handleTipoChange(newTipo: TituloPagarTipo) {
    setForm(p => ({ ...p, tipo: newTipo, favorecido: '' }))
    setSelectedContaFixaId('')
  }

  function handleContaFixaSelect(cfId: string) {
    setSelectedContaFixaId(cfId)
    const cf = contasFixas.find(c => c.id === cfId)
    if (cf) {
      setForm(p => ({
        ...p,
        favorecido: cfId,
        valor: cf.valor,
        parcela_valores: distributeValor(cf.valor, p.total_parcelas),
      }))
    } else {
      setForm(p => ({ ...p, favorecido: '' }))
    }
  }

  function handleValorChange(val: number) {
    setForm(p => ({
      ...p,
      valor: val,
      parcela_valores: distributeValor(val, p.total_parcelas),
    }))
  }

  function handleDataEmissaoChange(date: string) {
    setForm(p => ({
      ...p,
      data_emissao: date,
      parcela_vencimentos: Array.from({ length: p.total_parcelas }, (_, i) => addMonths(date, i + 1)),
    }))
  }

  function handleRecorrenteChange(checked: boolean) {
    const base = form.data_emissao || todayStr()
    if (checked) {
      setForm(p => ({
        ...p,
        recorrente: true,
        total_parcelas: 12,
        parcela_vencimentos: Array.from({ length: 12 }, (_, i) => addMonths(base, i + 1)),
        parcela_valores: distributeValor(p.valor || 0, 12),
      }))
    } else {
      setForm(p => ({
        ...p,
        recorrente: false,
        total_parcelas: 1,
        parcela_vencimentos: [addMonths(p.data_emissao || todayStr(), 1)],
        parcela_valores: distributeValor(p.valor || 0, 1),
      }))
    }
  }

  function handleTotalParcelasChange(val: number) {
    const n = Math.max(1, Math.min(24, val || 1))
    setForm(prev => ({
      ...prev,
      total_parcelas: n,
      parcela_vencimentos: Array.from(
        { length: n },
        (_, i) => prev.parcela_vencimentos[i] || addMonths(prev.data_emissao, i + 1),
      ),
      parcela_valores: distributeValor(prev.valor || 0, n),
    }))
  }

  function setVencimento(i: number, value: string) {
    setForm(prev => {
      const arr = [...prev.parcela_vencimentos]
      arr[i] = value
      return { ...prev, parcela_vencimentos: arr }
    })
  }

  function setParcelaValor(i: number, val: number) {
    setForm(prev => {
      const arr = [...prev.parcela_valores]
      arr[i] = val
      return { ...prev, parcela_valores: arr }
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

  function renderFavorecidoField() {
    if (form.tipo === 'fornecedor') {
      return (
        <SearchSelect
          options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
          value={form.favorecido}
          onChange={v => setForm(p => ({ ...p, favorecido: v }))}
          placeholder="Selecione o fornecedor"
          hasError={!!errors.favorecido}
        />
      )
    }
    if (form.tipo === 'folha') {
      return (
        <SearchSelect
          options={instrutores.map(u => ({ value: u.id, label: u.nome }))}
          value={form.favorecido}
          onChange={v => setForm(p => ({ ...p, favorecido: v }))}
          placeholder="Selecione o instrutor/funcionário"
          hasError={!!errors.favorecido}
        />
      )
    }
    if (form.tipo === 'conta_fixa') {
      return (
        <SearchSelect
          options={contasFixas.map(cf => ({ value: cf.id, label: cf.nome }))}
          value={selectedContaFixaId}
          onChange={handleContaFixaSelect}
          placeholder="Selecione a conta fixa"
          hasError={!!errors.favorecido}
        />
      )
    }
    return (
      <Input
        placeholder="Nome do favorecido"
        value={form.favorecido}
        onChange={e => setForm(p => ({ ...p, favorecido: e.target.value }))}
        hasError={!!errors.favorecido}
      />
    )
  }

  const count = form.total_parcelas

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Título a Pagar' : 'Novo Título a Pagar'}</DialogTitle>
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
                onChange={e => handleTipoChange(e.target.value as TituloPagarTipo)}
              >
                {ALL_TITULO_PAGAR_TIPOS.map(t => (
                  <option key={t} value={t}>{TITULO_PAGAR_TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Favorecido</label>
              {renderFavorecidoField()}
              {errors.favorecido && (
                <p className="text-xs text-destructive">{errors.favorecido}</p>
              )}
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

          {/* Recorrente (after Descrição, create only) */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={e => handleRecorrenteChange(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Título recorrente (gera 12 parcelas)</span>
            </label>
          )}

          {/* Valor Total + Data emissão + Nº parcelas */}
          <div className={cn('grid gap-3', !isEdit && !form.recorrente ? 'grid-cols-3' : 'grid-cols-2')}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor Total (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.valor || ''}
                onChange={e => handleValorChange(parseFloat(e.target.value) || 0)}
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
                onChange={e => handleDataEmissaoChange(e.target.value)}
              />
              {errors.data_emissao && (
                <p className="text-xs text-destructive">{errors.data_emissao}</p>
              )}
            </div>
            {!isEdit && !form.recorrente && (
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

          {/* Parcelas — recorrente: scrollable 12 rows */}
          {form.recorrente && !isEdit && (
            <div className="space-y-2">
              <div className="grid grid-cols-[calc(50%+16px)_calc(50%-26px)]">
                <label className="text-sm font-medium">Vencimento (12 meses)</label>
                <label className="text-sm font-medium">
                  Valor (R$)
                </label>
              </div>


              <div className="space-y-1.5">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="grid grid-cols-[12px_1fr_1fr] items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{i + 1}</span>
                    <input
                      type="date"
                      className={dateCls}
                      value={form.parcela_vencimentos[i] ?? ''}
                      onChange={e => setVencimento(i, e.target.value)}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0,00"
                      value={form.parcela_valores[i] ?? ''}
                      onChange={e => setParcelaValor(i, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
              {errors.parcela_vencimentos && (
                <p className="text-xs text-destructive">{errors.parcela_vencimentos}</p>
              )}
            </div>
          )}

          {/* Parcelas — non-recorrente: single or multi rows each with date + valor */}
          {!form.recorrente && (
            <div className="space-y-2">
              <div className="grid grid-cols-[calc(50%+16px)_calc(50%-26px)]">
                <label className="text-sm font-medium">
                  Vencimento
                </label>
                <label className="text-sm font-medium">
                  Valor (R$)
                </label>
              </div>


              {count === 1 ? (
                <div className="grid grid-cols-[12px_1fr_1fr] items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{1}</span>
                  <input
                    type="date"
                    className={dateCls}
                    value={form.parcela_vencimentos[0] ?? ''}
                    onChange={e => setVencimento(0, e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    value={form.parcela_valores[0] ?? ''}
                    onChange={e => setParcelaValor(0, parseFloat(e.target.value) || 0)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="grid grid-cols-[12px_1fr_1fr] items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">{i + 1}</span>
                      <input
                        type="date"
                        className={dateCls}
                        value={form.parcela_vencimentos[i] ?? ''}
                        onChange={e => setVencimento(i, e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                        value={form.parcela_valores[i] ?? ''}
                        onChange={e => setParcelaValor(i, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {errors.parcela_vencimentos && (
                <p className="text-xs text-destructive">{errors.parcela_vencimentos}</p>
              )}
            </div>
          )}

          {/* Multa — only for overdue or already paid titles */}
          {showMultaField && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Multa (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.multa || ''}
                onChange={e => setForm(p => ({ ...p, multa: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          )}

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
