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
  type Receita,
  type ReceitaTipo,
  RECEITA_TIPO_LABELS,
  RECEITA_TIPOS_MANUAIS,
} from '@/mocks/financeiroOrigem'
import { type ReceitaInput } from '@/services/receitasService'
import { getUsers, type User } from '@/services/usersService'
import { getEntidades, type Entidade } from '@/services/entidadesService'

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
const dateCls = selectCls
const todayStr = () => new Date().toISOString().split('T')[0]
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

const CLIENTE_PERFIS = ['aluno', 'socio', 'externo'] as const

interface FormState {
  tipo: ReceitaTipo
  participante_id: string
  cliente_externo_id: string
  devedor_nome: string
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  gerar_titulo: boolean
}

function makeEmpty(): FormState {
  const hoje = todayStr()
  return {
    tipo: 'mensalidade',
    participante_id: '',
    cliente_externo_id: '',
    devedor_nome: '',
    descricao: '',
    valor: 0,
    data_emissao: hoje,
    data_vencimento: addMonths(hoje, 1),
    gerar_titulo: false,
  }
}

interface Props {
  receita?: Receita | null
  open: boolean
  onClose: () => void
  onSave: (data: ReceitaInput) => Promise<void>
  onDeleteRequest?: () => void
}

type FormErrors = { devedor?: string; descricao?: string; valor?: string; data_vencimento?: string }

export function ReceitaFormModal({ receita, open, onClose, onSave, onDeleteRequest }: Props) {
  const [form, setForm] = useState<FormState>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [usuariosOptions, setUsuariosOptions] = useState<{ value: string; label: string }[]>([])
  const [clientesOptions, setClientesOptions] = useState<{ value: string; label: string }[]>([])
  const isEdit = !!receita

  useEffect(() => {
    if (open) {
      Promise.all([getUsers(), getEntidades('cliente')])
        .then(([users, clientes]: [User[], Entidade[]]) => {
          setUsuariosOptions(
            users
              .filter(u => u.is_active && u.perfis.some(p => CLIENTE_PERFIS.includes(p as typeof CLIENTE_PERFIS[number])))
              .map(u => ({ value: u.id, label: u.nome })),
          )
          setClientesOptions(clientes.filter(e => e.is_active).map(e => ({ value: e.id, label: e.nome })))
        })
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setForm(
        receita
          ? {
              tipo: receita.tipo,
              participante_id: receita.participante_id ?? '',
              cliente_externo_id: receita.cliente_externo_id ?? '',
              devedor_nome: receita.devedor_nome,
              descricao: receita.descricao,
              valor: receita.valor,
              data_emissao: receita.data_emissao,
              data_vencimento: receita.data_vencimento,
              gerar_titulo: false,
            }
          : makeEmpty(),
      )
      setErrors({})
    }
  }, [receita, open])

  const tiposDisponiveis = isEdit ? [...RECEITA_TIPOS_MANUAIS, receita!.tipo].filter((t, i, a) => a.indexOf(t) === i) : RECEITA_TIPOS_MANUAIS

  function handleTipoChange(t: ReceitaTipo) {
    setForm(p => ({ ...p, tipo: t, participante_id: '', cliente_externo_id: '', devedor_nome: '' }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.devedor_nome.trim()) e.devedor = 'Devedor é obrigatório'
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
        participante_id: form.tipo === 'servico' ? undefined : form.participante_id || undefined,
        cliente_externo_id: form.tipo === 'servico' ? form.cliente_externo_id || undefined : undefined,
        tipo: form.tipo,
        descricao: form.descricao,
        valor: form.valor,
        data_emissao: form.data_emissao,
        data_vencimento: form.data_vencimento,
        gerar_titulo: form.gerar_titulo,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function renderDevedor() {
    if (form.tipo === 'servico') {
      return (
        <SearchSelect
          options={clientesOptions}
          value={form.cliente_externo_id}
          onChange={v => {
            const found = clientesOptions.find(o => o.value === v)
            setForm(p => ({ ...p, cliente_externo_id: v, participante_id: '', devedor_nome: found?.label ?? v }))
          }}
          placeholder="Selecione o cliente"
          hasError={!!errors.devedor}
        />
      )
    }
    return (
      <SearchSelect
        options={usuariosOptions}
        value={form.participante_id}
        onChange={v => {
          const found = usuariosOptions.find(o => o.value === v)
          setForm(p => ({ ...p, participante_id: v, cliente_externo_id: '', devedor_nome: found?.label ?? v }))
        }}
        placeholder="Selecione o devedor"
        hasError={!!errors.devedor}
        allowFreeText={form.tipo === 'outros'}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize a origem do valor a receber.' : 'Cadastre uma origem de valor a receber. Você decide depois se ela vira título.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select className={selectCls} value={form.tipo} onChange={e => handleTipoChange(e.target.value as ReceitaTipo)} disabled={isEdit}>
                {tiposDisponiveis.map(t => (
                  <option key={t} value={t}>{RECEITA_TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Devedor</label>
              {renderDevedor()}
              {errors.devedor && <p className="text-xs text-destructive">{errors.devedor}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Descrição da receita"
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              hasError={!!errors.descricao}
              helper={errors.descricao}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.gerar_titulo}
                onChange={e => setForm(p => ({ ...p, gerar_titulo: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Gerar título a receber automaticamente</span>
            </label>
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
