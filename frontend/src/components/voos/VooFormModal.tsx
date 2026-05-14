import { useState, useEffect, useMemo, type FormEvent } from 'react'
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
  type TipoVoo,
  TIPO_VOO_LABELS,
  ALL_TIPOS_VOO,
  TIPOS_VOO_COM_INSTRUTOR,
} from '@/mocks/voos'
import { type Aeronave } from '@/mocks/aeronaves'
import { type Entidade } from '@/mocks/entidades'
import { type User } from '@/services/usersService'

export interface VooFormData {
  aeronave_id: string
  aeronave_nome: string
  participante_id: string
  participante_nome: string
  instrutor_id: string | null
  instrutor_nome: string | null
  tipo_voo: TipoVoo
  inicio: string
  fim: string
  tempo_decimal: number
  origem: string
  destino: string
  valor_hora: number
  data: string
}

interface VooFormModalProps {
  voo?: (VooFormData & { id: string }) | null
  open: boolean
  onClose: () => void
  onSave: (data: VooFormData) => Promise<void>
  onDeleteRequest?: () => void
  aeronaves: Aeronave[]
  usuarios: User[]
  instrutores: Entidade[]
}

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const dateCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const todayStr = () => new Date().toISOString().split('T')[0]

function makeEmpty(): VooFormData {
  return {
    aeronave_id: '',
    aeronave_nome: '',
    participante_id: '',
    participante_nome: '',
    instrutor_id: null,
    instrutor_nome: null,
    tipo_voo: 'instrucao_duplo',
    inicio: '',
    fim: '',
    tempo_decimal: 0,
    origem: '',
    destino: '',
    valor_hora: 0,
    data: todayStr(),
  }
}

function calcTempoDecimal(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  const totalMin = h2 * 60 + m2 - (h1 * 60 + m1)
  if (totalMin <= 0) return 0
  if (totalMin <= 3) return 0
  return Math.round(Math.ceil((totalMin - 3) / 6) * 10) / 100
}

const PERFIL_POR_TIPO: Record<TipoVoo, 'aluno' | 'socio' | 'cliente_externo'> = {
  instrucao_solo: 'aluno',
  instrucao_duplo: 'aluno',
  socio_solo: 'socio',
  socio_duplo: 'socio',
  externo: 'cliente_externo',
}

type FormErrors = {
  aeronave_id?: string
  participante_id?: string
  instrutor_id?: string
  inicio?: string
  fim?: string
  data?: string
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function VooFormModal({
  voo,
  open,
  onClose,
  onSave,
  onDeleteRequest,
  aeronaves,
  usuarios,
  instrutores,
}: VooFormModalProps) {
  const [form, setForm] = useState<VooFormData>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!voo

  useEffect(() => {
    if (open) {
      setForm(voo ? { ...voo } : makeEmpty())
      setErrors({})
    }
  }, [voo, open])

  // Recalculate tempo_decimal when times change
  useEffect(() => {
    if (form.inicio && form.fim) {
      const decimal = calcTempoDecimal(form.inicio, form.fim)
      setForm(p => ({ ...p, tempo_decimal: decimal }))
    }
  }, [form.inicio, form.fim])

  // Recalculate valor_hora when aircraft or tipo changes
  useEffect(() => {
    const aeronave = aeronaves.find(a => a.id === form.aeronave_id)
    if (aeronave) {
      const isDuplo = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
      setForm(p => ({ ...p, valor_hora: isDuplo ? aeronave.valor_duplo : aeronave.valor_solo }))
    }
  }, [form.aeronave_id, form.tipo_voo, aeronaves])

  const participantesFiltrados = useMemo(() => {
    const perfil = PERFIL_POR_TIPO[form.tipo_voo]
    return usuarios.filter(u => u.is_active && u.perfis.includes(perfil))
  }, [form.tipo_voo, usuarios])

  const precisaInstrutor = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)

  function handleTipoChange(tipo: TipoVoo) {
    setForm(p => ({
      ...p,
      tipo_voo: tipo,
      participante_id: '',
      participante_nome: '',
      instrutor_id: null,
      instrutor_nome: null,
    }))
  }

  function handleAeronaveChange(id: string) {
    const a = aeronaves.find(a => a.id === id)
    setForm(p => ({ ...p, aeronave_id: id, aeronave_nome: a?.nome ?? '' }))
  }

  function handleParticipanteChange(id: string) {
    const u = usuarios.find(u => u.id === id)
    setForm(p => ({ ...p, participante_id: id, participante_nome: u?.nome ?? '' }))
  }

  function handleInstrutorChange(id: string) {
    const i = instrutores.find(i => i.id === id)
    setForm(p => ({ ...p, instrutor_id: id || null, instrutor_nome: i?.nome ?? null }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.aeronave_id) e.aeronave_id = 'Selecione a aeronave'
    if (!form.participante_id) e.participante_id = 'Selecione o participante'
    if (precisaInstrutor && !form.instrutor_id) e.instrutor_id = 'Instrutor é obrigatório'
    if (!form.inicio) e.inicio = 'Informe o horário de início'
    if (!form.fim) e.fim = 'Informe o horário de término'
    if (form.inicio && form.fim && form.tempo_decimal <= 0)
      e.fim = 'Horário de término deve ser após o início'
    if (!form.data) e.data = 'Data é obrigatória'
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

  const valorEstimado = form.tempo_decimal * form.valor_hora

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Voo' : 'Registrar Voo'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do voo.' : 'Preencha os dados do voo realizado.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                className={dateCls}
                value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
              />
              {errors.data && <p className="text-xs text-destructive">{errors.data}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de voo</label>
              <select
                className={selectCls}
                value={form.tipo_voo}
                onChange={e => handleTipoChange(e.target.value as TipoVoo)}
              >
                {ALL_TIPOS_VOO.map(t => (
                  <option key={t} value={t}>
                    {TIPO_VOO_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Aeronave</label>
            <select
              className={selectCls}
              value={form.aeronave_id}
              onChange={e => handleAeronaveChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {aeronaves.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            {errors.aeronave_id && (
              <p className="text-xs text-destructive">{errors.aeronave_id}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Participante</label>
            <select
              className={selectCls}
              value={form.participante_id}
              onChange={e => handleParticipanteChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {participantesFiltrados.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            {errors.participante_id && (
              <p className="text-xs text-destructive">{errors.participante_id}</p>
            )}
          </div>

          {precisaInstrutor && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instrutor</label>
              <select
                className={selectCls}
                value={form.instrutor_id ?? ''}
                onChange={e => handleInstrutorChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {instrutores.filter(i => i.is_active).map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </select>
              {errors.instrutor_id && (
                <p className="text-xs text-destructive">{errors.instrutor_id}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Início</label>
              <input
                type="time"
                className={dateCls}
                value={form.inicio}
                onChange={e => setForm(p => ({ ...p, inicio: e.target.value }))}
              />
              {errors.inicio && <p className="text-xs text-destructive">{errors.inicio}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Término</label>
              <input
                type="time"
                className={dateCls}
                value={form.fim}
                onChange={e => setForm(p => ({ ...p, fim: e.target.value }))}
              />
              {errors.fim && <p className="text-xs text-destructive">{errors.fim}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tempo decimal</label>
              <div className="h-10 rounded-lg border border-input bg-muted/40 px-2.5 text-sm flex items-center font-medium">
                {form.tempo_decimal.toFixed(1)}h
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Origem (ICAO)</label>
              <Input
                placeholder="SDAG"
                value={form.origem}
                onChange={e => setForm(p => ({ ...p, origem: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Destino (ICAO)</label>
              <Input
                placeholder="SDAG"
                value={form.destino}
                onChange={e => setForm(p => ({ ...p, destino: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          {form.tempo_decimal > 0 && form.valor_hora > 0 && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor/hora</span>
                <span className="font-medium">{fmt(form.valor_hora)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo</span>
                <span className="font-medium">{form.tempo_decimal.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-medium">Valor estimado</span>
                <span className="font-semibold text-primary">{fmt(valorEstimado)}</span>
              </div>
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
                  {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar Voo'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
