import { useState, useEffect, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useAlert } from '@/components/feedback/alert-provider'
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
  type Custo,
  type CustoTipo,
  CUSTO_TIPO_LABELS,
  CUSTO_TIPOS_MANUAIS,
} from '@/mocks/financeiroOrigem'
import { type CustoInput } from '@/services/custosService'
import { getContasFixas, type ContaFixa } from '@/services/contaFixaService'
import { getEntidades, type Entidade } from '@/services/entidadesService'
import { getUsers, type User, type UserProfile } from '@/services/usersService'

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
const dateCls = selectCls
const todayStr = () => new Date().toISOString().split('T')[0]
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

interface FormState {
  tipo: CustoTipo
  favorecido: string
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  is_recorrente: boolean
  gerar_titulo: boolean
}

function makeEmpty(): FormState {
  const hoje = todayStr()
  return {
    tipo: 'fornecedor',
    favorecido: '',
    descricao: '',
    valor: 0,
    data_emissao: hoje,
    data_vencimento: addMonths(hoje, 1),
    is_recorrente: false,
    gerar_titulo: false,
  }
}

interface Props {
  custo?: Custo | null
  open: boolean
  onClose: () => void
  onSave: (data: CustoInput) => Promise<void>
  onDeleteRequest?: () => void
}

type FormErrors = { favorecido?: string; descricao?: string; valor?: string; data_vencimento?: string }

export function CustoFormModal({ custo, open, onClose, onSave, onDeleteRequest }: Props) {
  const [form, setForm] = useState<FormState>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [selectedContaFixaId, setSelectedContaFixaId] = useState('')
  const [fornecedores, setFornecedores] = useState<Entidade[]>([])
  const [colaboradores, setColaboradores] = useState<User[]>([])
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([])
  const isEdit = !!custo
  const alert = useAlert()

  useEffect(() => {
    if (open) {
      Promise.all([getEntidades('fornecedor'), getUsers(), getContasFixas()])
        .then(([f, us, cfs]) => {
          setFornecedores(f.filter(e => e.is_active))
          setColaboradores(us.filter(u =>
            u.is_active &&
            (u.perfis.includes('instrutor' as UserProfile) || u.perfis.includes('funcionario' as UserProfile)),
          ))
          setContasFixas(cfs.filter(cf => cf.is_active))
        })
        .catch(e => alert.error(e, 'Erro ao carregar opções do formulário.'))
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setForm(
        custo
          ? {
              tipo: custo.tipo,
              favorecido: custo.favorecido_id ?? custo.favorecido_nome,
              descricao: custo.descricao,
              valor: custo.valor,
              data_emissao: custo.data_emissao,
              data_vencimento: custo.data_vencimento,
              is_recorrente: custo.is_recorrente,
              gerar_titulo: false,
            }
          : makeEmpty(),
      )
      setSelectedContaFixaId('')
      setErrors({})
    }
  }, [custo, open])

  function handleTipoChange(t: CustoTipo) {
    setForm(p => ({ ...p, tipo: t, favorecido: '' }))
    setSelectedContaFixaId('')
  }

  function handleContaFixaSelect(cfId: string) {
    setSelectedContaFixaId(cfId)
    const cf = contasFixas.find(c => c.id === cfId)
    setForm(p => ({ ...p, favorecido: cf ? cfId : '', valor: cf ? cf.valor : p.valor }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.favorecido.trim()) e.favorecido = 'Favorecido é obrigatório'
    if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória'
    if (!form.valor || form.valor <= 0) e.valor = 'Valor deve ser maior que zero'
    if (!form.data_vencimento) e.data_vencimento = 'Vencimento é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        tipo: form.tipo,
        favorecido: form.favorecido,
        descricao: form.descricao,
        valor: form.valor,
        data_emissao: form.data_emissao,
        data_vencimento: form.data_vencimento,
        is_recorrente: form.is_recorrente,
        gerar_titulo: form.gerar_titulo,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function renderFavorecido() {
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
    if (form.tipo === 'folha_pagamento') {
      return (
        <SearchSelect
          options={colaboradores.map(u => ({ value: u.id, label: u.nome }))}
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

  const tiposDisponiveis = isEdit ? CUSTO_TIPOS_MANUAIS : CUSTO_TIPOS_MANUAIS

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Custo' : 'Novo Custo'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize a origem do valor a pagar.' : 'Cadastre uma origem de valor a pagar. Você decide depois se ela vira título.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select className={selectCls} value={form.tipo} onChange={e => handleTipoChange(e.target.value as CustoTipo)} disabled={isEdit}>
                {tiposDisponiveis.map(t => (
                  <option key={t} value={t}>{CUSTO_TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Favorecido</label>
              {renderFavorecido()}
              {errors.favorecido && <p className="text-xs text-destructive">{errors.favorecido}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Descrição do custo"
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              hasError={!!errors.descricao}
              helper={errors.descricao}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number" min={0} step={0.01} placeholder="0,00"
                value={form.valor || ''}
                onChange={e => setForm(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                hasError={!!errors.valor}
                helper={errors.valor}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Emissão</label>
              <input type="date" className={dateCls} value={form.data_emissao} onChange={e => setForm(p => ({ ...p, data_emissao: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vencimento</label>
              <input type="date" className={dateCls} value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} />
              {errors.data_vencimento && <p className="text-xs text-destructive">{errors.data_vencimento}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_recorrente}
                  onChange={e => setForm(p => ({ ...p, is_recorrente: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">Custo recorrente (mensal)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.gerar_titulo}
                  onChange={e => setForm(p => ({ ...p, gerar_titulo: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">Gerar título a pagar automaticamente</span>
              </label>
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full items-center gap-2">
              {isEdit && onDeleteRequest && (
                <Button
                  type="button" variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={onDeleteRequest} disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
