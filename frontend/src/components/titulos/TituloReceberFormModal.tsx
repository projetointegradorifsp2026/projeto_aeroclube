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
  type TituloReceber,
  type TituloReceberTipo,
  TITULO_RECEBER_TIPO_LABELS,
} from '@/mocks/titulos'
import { mockUsers } from '@/mocks/users'
import { cn } from '@/lib/utils'

export interface TituloReceberFormData {
  participante: string
  tipo: TituloReceberTipo
  descricao: string
  total_parcelas: number
  valor: number
  multa: number
  data_emissao: string
  parcela_vencimentos: string[]
  parcela_valores: number[]
}

interface TituloReceberFormModalProps {
  titulo?: TituloReceber | null
  open: boolean
  onClose: () => void
  onSave: (data: TituloReceberFormData) => Promise<void>
  onDeleteRequest?: () => void
}

const TIPOS_FORM: TituloReceberTipo[] = ['mensalidade', 'servico', 'outros']

const todayStr = () => new Date().toISOString().split('T')[0]

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function distributeValor(total: number, count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [total]
  const totalRounded = Math.round(total)
  if (Math.abs(total - totalRounded) < 0.005) {
    const base = Math.floor(totalRounded / count)
    const remainder = totalRounded - base * count
    return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base))
  }
  const totalCents = Math.round(total * 100)
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base) / 100)
}

function makeEmptyForm(): TituloReceberFormData {
  const hoje = todayStr()
  return {
    participante: '',
    tipo: 'mensalidade',
    descricao: '',
    total_parcelas: 1,
    valor: 0,
    multa: 0,
    data_emissao: hoje,
    parcela_vencimentos: [addMonths(hoje, 1)],
    parcela_valores: [0],
  }
}

type FormErrors = {
  participante?: string
  descricao?: string
  valor?: string
  data_emissao?: string
  parcela_vencimentos?: string
}

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const dateCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

// Opções para mensalidade/outros: alunos, sócios e clientes externos ativos
const clientePerfis = ['aluno', 'socio', 'externo'] as const
const usuariosOptions = mockUsers
  .filter(u => u.is_active && u.perfis.some(p => (clientePerfis as ReadonlyArray<string>).includes(p.perfil)))
  .map(u => ({ value: String(u.id), label: u.nome }))

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

  const isTituloAtrasado =
    titulo != null &&
    titulo.status !== 'baixado' &&
    new Date(titulo.data_vencimento + 'T00:00:00') < new Date()
  const showMultaField = isEdit && (titulo?.status === 'baixado' || isTituloAtrasado)

  useEffect(() => {
    if (open) {
      setForm(
        titulo
          ? {
              participante: String(titulo.participante),
              tipo: titulo.tipo,
              descricao: titulo.descricao,
              total_parcelas: 1,
              valor: titulo.valor_original,
              multa: 0,
              data_emissao: titulo.data_emissao,
              parcela_vencimentos: [titulo.data_vencimento],
              parcela_valores: [titulo.valor_original],
            }
          : makeEmptyForm(),
      )
      setErrors({})
    }
  }, [titulo, open])

  function handleTipoChange(newTipo: TituloReceberTipo) {
    setForm(p => ({ ...p, tipo: newTipo, participante: '' }))
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
    if (!form.participante.trim()) e.participante = 'Devedor é obrigatório'
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

  function renderDevedorField() {
    // mensalidade / servico / outros — participante is always a User
    return (
      <SearchSelect
        options={usuariosOptions}
        value={form.participante}
        onChange={v => setForm(p => ({ ...p, participante: v }))}
        placeholder="Selecione o devedor"
        hasError={!!errors.participante}
      />
    )
  }

  const count = form.total_parcelas

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          {/* Tipo + Devedor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select
                className={selectCls}
                value={form.tipo}
                onChange={e => handleTipoChange(e.target.value as TituloReceberTipo)}
              >
                {TIPOS_FORM.map(t => (
                  <option key={t} value={t}>
                    {TITULO_RECEBER_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Devedor</label>
              {renderDevedorField()}
              {errors.participante && (
                <p className="text-xs text-destructive">{errors.participante}</p>
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

          {/* Valor Total + Emissão + Parcelas */}
          <div className={cn('grid gap-3', isEdit ? 'grid-cols-2' : 'grid-cols-3')}>
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

          {/* Vencimentos + Valores por parcela */}
          <div className="space-y-2">
            <div className="grid grid-cols-[calc(50%+16px)_calc(50%-26px)]">
              <label className="text-sm font-medium">Vencimento</label>
              <label className="text-sm font-medium">Valor (R$)</label>
            </div>
            {count === 1 ? (
              <div className="grid grid-cols-[12px_1fr_1fr] items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">1</span>
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
