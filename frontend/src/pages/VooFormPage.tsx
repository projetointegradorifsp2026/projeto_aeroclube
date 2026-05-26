import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchSelect } from '@/components/ui/search-select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type TipoVoo,
  TIPO_VOO_LABELS,
  ALL_TIPOS_VOO,
  TIPOS_VOO_COM_INSTRUTOR,
  type Voo,
} from '@/mocks/voos'
import { type TipoAeronave, type Aeronave } from '@/mocks/aeronaves'
import { getAeronaves } from '@/services/aeronavesService'
import { getEntidades, type Entidade } from '@/services/entidadesService'
import { getUsers, type User } from '@/services/usersService'
import { createVoo, updateVoo, deleteVoo } from '@/services/voosService'
import { createTituloReceber } from '@/services/titulosReceberService'
import { createTituloPagar } from '@/services/titulosPagarService'
import { getCarteiraByParticipante, debitarCarteira } from '@/services/carteiraService'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
const dateCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const todayStr = () => new Date().toISOString().split('T')[0]

function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

function calcTempoDecimal(hora_inicio: string, hora_fim: string): number {
  if (!hora_inicio || !hora_fim) return 0
  const [h1, m1] = hora_inicio.split(':').map(Number)
  const [h2, m2] = hora_fim.split(':').map(Number)
  const totalMin = h2 * 60 + m2 - (h1 * 60 + m1)
  if (totalMin <= 3) return 0
  return Math.round(Math.ceil((totalMin - 3) / 6) * 10) / 100
}

function calcMinutosPlanador(hora_inicio: string, hora_fim: string): number {
  if (!hora_inicio || !hora_fim) return 0
  const [h1, m1] = hora_inicio.split(':').map(Number)
  const [h2, m2] = hora_fim.split(':').map(Number)
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
}

function calcValorPlanador(hora_inicio: string, hora_fim: string, aeronave: Aeronave): number {
  const totalMin = calcMinutosPlanador(hora_inicio, hora_fim)
  if (totalMin <= 0) return 0
  if (totalMin <= aeronave.tempo_limite) return aeronave.valor_fixo_inicial
  return aeronave.valor_fixo_inicial + (totalMin - aeronave.tempo_limite) * aeronave.valor_por_minuto
}

const PERFIL_POR_TIPO: Record<TipoVoo, 'aluno' | 'socio' | 'externo'> = {
  instrucao_solo: 'aluno',
  instrucao_duplo: 'aluno',
  socio_solo: 'socio',
  socio_duplo: 'socio',
  externo: 'externo',
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  tipo_aeronave: TipoAeronave
  aeronave_id: string
  aeronave_nome: string
  participante_id: string
  participante_nome: string
  instrutor_id: string | null
  instrutor_nome: string | null
  tipo_voo: TipoVoo
  hora_inicio: string
  hora_fim: string
  tempo_decimal: number
  origem: string
  destino: string
  valor_hora: number
  taxa_instrutor: number | null
  data_voo: string
  data_vencimento: string
}

type FormErrors = {
  aeronave_id?: string
  participante_id?: string
  instrutor_id?: string
  hora_inicio?: string
  hora_fim?: string
  data_voo?: string
  data_vencimento?: string
}

function makeEmpty(): FormState {
  const today = todayStr()
  return {
    tipo_aeronave: 'aviao',
    aeronave_id: '',
    aeronave_nome: '',
    participante_id: '',
    participante_nome: '',
    instrutor_id: null,
    instrutor_nome: null,
    tipo_voo: 'instrucao_duplo',
    hora_inicio: '',
    hora_fim: '',
    tempo_decimal: 0,
    origem: '',
    destino: '',
    valor_hora: 0,
    taxa_instrutor: 10,
    data_voo: today,
    data_vencimento: addOneMonth(today),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VooFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const location = useLocation()
  const isEdit = !!id

  const [form, setForm] = useState<FormState>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [aeronaves, setAeronaves] = useState<Aeronave[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [instrutores, setInstrutores] = useState<Entidade[]>([])

  const [usarCarteira, setUsarCarteira] = useState(false)
  const [carteiraValor, setCarteiraValor] = useState('')

  const autoVencimento = useRef<string>('')

  useEffect(() => {
    Promise.all([getAeronaves(), getUsers(), getEntidades('instrutor')]).then(
      ([avs, us, insts]) => {
        setAeronaves(avs)
        setUsuarios(us)
        setInstrutores(insts)

        if (isEdit) {
          const vooFromState = location.state?.voo as Voo | undefined
          if (!vooFromState) {
            navigate('/voos')
            return
          }
          const aeronave = avs.find(a => a.id === vooFromState.aeronave)
          const isDuplo = TIPOS_VOO_COM_INSTRUTOR.includes(vooFromState.tipo_voo)
          const valorHora =
            aeronave?.tipo === 'aviao'
              ? isDuplo
                ? aeronave.valor_duplo
                : aeronave.valor_solo
              : 0
          const initial: FormState = {
            tipo_aeronave: vooFromState.tipo_aeronave,
            aeronave_id: String(vooFromState.aeronave),
            aeronave_nome: vooFromState.aeronave_nome,
            participante_id: String(vooFromState.participante),
            participante_nome: vooFromState.participante_nome,
            instrutor_id: vooFromState.instrutor ? String(vooFromState.instrutor) : null,
            instrutor_nome: vooFromState.instrutor_nome,
            tipo_voo: vooFromState.tipo_voo,
            hora_inicio: vooFromState.hora_inicio,
            hora_fim: vooFromState.hora_fim,
            tempo_decimal: vooFromState.tempo_decimal,
            origem: vooFromState.origem ?? '',
            destino: vooFromState.destino ?? '',
            valor_hora: valorHora,
            taxa_instrutor: 10,
            data_voo: vooFromState.data_voo,
            data_vencimento: addOneMonth(vooFromState.data_voo),
          }
          setForm(initial)
          autoVencimento.current = addOneMonth(initial.data_voo)
        } else {
          autoVencimento.current = addOneMonth(todayStr())
        }

        setLoading(false)
      },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalculate tempo_decimal when hora_inicio/hora_fim change
  useEffect(() => {
    if (form.hora_inicio && form.hora_fim) {
      setForm(p => ({ ...p, tempo_decimal: calcTempoDecimal(form.hora_inicio, form.hora_fim) }))
    }
  }, [form.hora_inicio, form.hora_fim])

  // Update valor_hora when aeronave or tipo_voo changes (avião only)
  useEffect(() => {
    const aeronave = aeronaves.find(a => String(a.id) === form.aeronave_id)
    if (aeronave?.tipo === 'aviao') {
      const isDuplo = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
      setForm(p => ({ ...p, valor_hora: isDuplo ? aeronave.valor_duplo : aeronave.valor_solo }))
    }
  }, [form.aeronave_id, form.tipo_voo, aeronaves])

  // Auto-update data_vencimento when data_voo changes
  useEffect(() => {
    if (!form.data_voo) return
    const auto = addOneMonth(form.data_voo)
    if (form.data_vencimento === autoVencimento.current) {
      setForm(p => ({ ...p, data_vencimento: auto }))
    }
    autoVencimento.current = auto
  }, [form.data_voo])

  // ─── Computed values ────────────────────────────────────────────────────────

  const selectedAeronave = useMemo(
    () => aeronaves.find(a => String(a.id) === form.aeronave_id),
    [aeronaves, form.aeronave_id],
  )

  const valorVoo = useMemo(() => {
    if (!selectedAeronave) return 0
    if (selectedAeronave.tipo === 'planador') {
      return calcValorPlanador(form.hora_inicio, form.hora_fim, selectedAeronave)
    }
    return form.tempo_decimal * form.valor_hora
  }, [selectedAeronave, form.hora_inicio, form.hora_fim, form.tempo_decimal, form.valor_hora])

  const minutosPlanador = useMemo(
    () => calcMinutosPlanador(form.hora_inicio, form.hora_fim),
    [form.hora_inicio, form.hora_fim],
  )

  const aeronaveOptions = useMemo(
    () =>
      aeronaves
        .filter(a => a.is_active && a.tipo === form.tipo_aeronave)
        .map(a => ({ value: String(a.id), label: a.nome })),
    [aeronaves, form.tipo_aeronave],
  )

  const participanteOptions = useMemo(() => {
    const perfil = PERFIL_POR_TIPO[form.tipo_voo]
    return usuarios
      .filter(u => u.is_active && u.perfis.some(p => p.perfil === perfil))
      .map(u => ({ value: String(u.id), label: u.nome }))
  }, [form.tipo_voo, usuarios])

  const instrutorOptions = useMemo(
    () => instrutores.filter(i => i.is_active).map(i => ({ value: String(i.id), label: i.nome })),
    [instrutores],
  )

  const precisaInstrutor = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
  const valorInstrutor =
    form.instrutor_id && form.taxa_instrutor != null
      ? valorVoo * (form.taxa_instrutor / 100)
      : 0

  const participanteSaldo = useMemo(
    () => usuarios.find(u => String(u.id) === form.participante_id)?.saldo_carteira ?? 0,
    [form.participante_id, usuarios],
  )
  const carteiraMaxUsavel = Math.min(participanteSaldo, valorVoo)
  const carteiraUsadaNum = usarCarteira ? Math.min(parseFloat(carteiraValor) || 0, carteiraMaxUsavel) : 0
  const valorTitulo = valorVoo - carteiraUsadaNum

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleTipoAeronaveChange(tipo: TipoAeronave) {
    setForm(p => ({ ...p, tipo_aeronave: tipo, aeronave_id: '', aeronave_nome: '', valor_hora: 0 }))
  }

  function handleTipoVooChange(tipo: TipoVoo) {
    setForm(p => ({
      ...p,
      tipo_voo: tipo,
      participante_id: '',
      participante_nome: '',
      instrutor_id: null,
      instrutor_nome: null,
    }))
  }

  function handleAeronaveChange(aeronaveId: string) {
    const a = aeronaves.find(a => String(a.id) === aeronaveId)
    setForm(p => ({ ...p, aeronave_id: aeronaveId, aeronave_nome: a?.nome ?? '' }))
  }

  function handleParticipanteChange(uid: string) {
    const u = usuarios.find(u => String(u.id) === uid)
    setForm(p => ({ ...p, participante_id: uid, participante_nome: u?.nome ?? '' }))
    setUsarCarteira(false)
    setCarteiraValor('')
  }

  function handleInstrutorChange(instId: string) {
    const inst = instrutores.find(i => String(i.id) === instId)
    setForm(p => ({
      ...p,
      instrutor_id: instId || null,
      instrutor_nome: inst?.nome ?? null,
      taxa_instrutor: instId ? (p.taxa_instrutor ?? 10) : null,
    }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.aeronave_id) e.aeronave_id = 'Selecione a aeronave'
    if (!form.participante_id) e.participante_id = 'Selecione o participante'
    if (precisaInstrutor && !form.instrutor_id) e.instrutor_id = 'Instrutor é obrigatório'
    if (!form.hora_inicio) e.hora_inicio = 'Informe o horário de início'
    if (!form.hora_fim) e.hora_fim = 'Informe o horário de término'
    if (form.hora_inicio && form.hora_fim) {
      const isPlanador = selectedAeronave?.tipo === 'planador'
      if (isPlanador ? minutosPlanador <= 0 : form.tempo_decimal <= 0)
        e.hora_fim = 'Horário de término deve ser após o início'
    }
    if (!form.data_voo) e.data_voo = 'Data é obrigatória'
    if (!form.data_vencimento) e.data_vencimento = 'Data de vencimento é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        aeronave: Number(form.aeronave_id),
        participante: Number(form.participante_id),
        instrutor: form.instrutor_id ? Number(form.instrutor_id) : null,
        tipo_voo: form.tipo_voo,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        data_voo: form.data_voo,
        origem: form.origem || null,
        destino: form.destino || null,
      }

      if (isEdit && id) {
        await updateVoo(Number(id), payload)
      } else {
        const voo = await createVoo(payload)

        const tempoDisplay =
          voo.tipo_aeronave === 'planador'
            ? `${voo.duracao_minutos}min`
            : `${voo.tempo_decimal.toFixed(1)}h`
        const descricaoVoo = `${TIPO_VOO_LABELS[voo.tipo_voo]} – ${tempoDisplay} – ${voo.aeronave_nome}`

        // Debit carteira if used
        if (carteiraUsadaNum > 0) {
          const carteira = await getCarteiraByParticipante(voo.participante)
          if (carteira) {
            await debitarCarteira(
              carteira.id,
              carteiraUsadaNum,
              `Débito carteira – ${descricaoVoo}`,
              voo.id,
            )
          }
        }

        // Generate TituloReceber for the remaining amount (if any)
        if (valorTitulo > 0) {
          const descricaoFinal =
            carteiraUsadaNum > 0
              ? `${descricaoVoo} (${fmt(carteiraUsadaNum)} via carteira)`
              : descricaoVoo
          await createTituloReceber({
            participante: voo.participante,
            tipo: 'voo',
            descricao: descricaoFinal,
            num_parcela: 1,
            total_parcelas: 1,
            valor_original: valorTitulo,
            data_emissao: voo.data_voo,
            data_vencimento: form.data_vencimento,
          })
        } else if (carteiraUsadaNum > 0) {
          // Full coverage — create a baixado título as record
          await createTituloReceber({
            participante: voo.participante,
            tipo: 'voo',
            descricao: `${descricaoVoo} (pago via carteira)`,
            num_parcela: 1,
            total_parcelas: 1,
            valor_original: voo.valor_total,
            data_emissao: voo.data_voo,
            data_vencimento: form.data_vencimento,
          })
        }

        // Create TituloPagar for instructor fee if applicable
        if (voo.instrutor && form.taxa_instrutor && form.taxa_instrutor > 0) {
          await createTituloPagar({
            tipo: 'folha_pagamento',
            favorecido: voo.instrutor,
            descricao: `Instrução – ${descricaoVoo}`,
            num_parcela: 1,
            total_parcelas: 1,
            valor: voo.valor_total * (form.taxa_instrutor / 100),
            data_emissao: voo.data_voo,
            data_vencimento: form.data_vencimento,
            is_recorrente: false,
          })
        }
      }

      navigate('/voos')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteVoo(Number(id))
      navigate('/voos')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pt-2 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/voos')} title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? 'Editar Voo' : 'Registrar Voo'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? 'Atualize os dados do voo.' : 'Preencha os dados do voo realizado.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Aeronave ─────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Aeronave
            </p>

            {/* Tipo selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de aeronave</label>
              <div className="flex rounded-lg border border-input overflow-hidden w-fit">
                {(['aviao', 'planador'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleTipoAeronaveChange(tipo)}
                    className={cn(
                      'px-5 py-2 text-sm font-medium transition-colors',
                      form.tipo_aeronave === tipo
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground',
                    )}
                  >
                    {tipo === 'aviao' ? 'Avião' : 'Planador'}
                  </button>
                ))}
              </div>
            </div>

            {/* Aeronave select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aeronave</label>
              <SearchSelect
                options={aeronaveOptions}
                value={form.aeronave_id}
                onChange={handleAeronaveChange}
                placeholder={`Selecione o ${form.tipo_aeronave === 'aviao' ? 'avião' : 'planador'}...`}
                hasError={!!errors.aeronave_id}
                emptyMessage={`Nenhum ${form.tipo_aeronave === 'aviao' ? 'avião' : 'planador'} ativo cadastrado`}
              />
              {errors.aeronave_id && (
                <p className="text-xs text-destructive">{errors.aeronave_id}</p>
              )}
            </div>

            {/* Pricing preview */}
            {selectedAeronave && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
                  Tarifação — {selectedAeronave.nome}
                </p>
                {selectedAeronave.tipo === 'aviao' ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Tarifa Solo</p>
                      <p className="font-semibold">
                        {fmt(selectedAeronave.valor_solo)}
                        <span className="text-xs text-muted-foreground font-normal"> /h</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Tarifa Duplo</p>
                      <p className="font-semibold">
                        {fmt(selectedAeronave.valor_duplo)}
                        <span className="text-xs text-muted-foreground font-normal"> /h</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Valor fixo</p>
                      <p className="font-semibold">{fmt(selectedAeronave.valor_fixo_inicial)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Inclui até</p>
                      <p className="font-semibold">{selectedAeronave.tempo_limite} min</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Adicional</p>
                      <p className="font-semibold">
                        {fmt(selectedAeronave.valor_por_minuto)}
                        <span className="text-xs text-muted-foreground font-normal"> /min</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Dados do Voo ─────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dados do Voo
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data</label>
                <input
                  type="date"
                  className={dateCls}
                  value={form.data_voo}
                  onChange={e => setForm(p => ({ ...p, data_voo: e.target.value }))}
                />
                {errors.data_voo && <p className="text-xs text-destructive">{errors.data_voo}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de voo</label>
                <select
                  className={selectCls}
                  value={form.tipo_voo}
                  onChange={e => handleTipoVooChange(e.target.value as TipoVoo)}
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
              <label className="text-sm font-medium">Participante</label>
              <SearchSelect
                options={participanteOptions}
                value={form.participante_id}
                onChange={handleParticipanteChange}
                placeholder="Selecione o participante..."
                hasError={!!errors.participante_id}
                emptyMessage="Nenhum participante para este tipo de voo"
              />
              {errors.participante_id && (
                <p className="text-xs text-destructive">{errors.participante_id}</p>
              )}
            </div>

            {precisaInstrutor && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Instrutor</label>
                  <SearchSelect
                    options={instrutorOptions}
                    value={form.instrutor_id ?? ''}
                    onChange={handleInstrutorChange}
                    placeholder="Selecione o instrutor..."
                    hasError={!!errors.instrutor_id}
                  />
                  {errors.instrutor_id && (
                    <p className="text-xs text-destructive">{errors.instrutor_id}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Taxa do instrutor (%)</label>
                  {form.instrutor_id ? (
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="10"
                        value={form.taxa_instrutor ?? ''}
                        onChange={e =>
                          setForm(p => ({
                            ...p,
                            taxa_instrutor: e.target.value === '' ? null : Number(e.target.value),
                          }))
                        }
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  ) : (
                    <div className="h-10 rounded-lg border border-input bg-muted/40 px-2.5 text-sm flex items-center text-muted-foreground">
                      Selecione um instrutor
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Início</label>
                <input
                  type="time"
                  className={dateCls}
                  value={form.hora_inicio}
                  onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))}
                />
                {errors.hora_inicio && (
                  <p className="text-xs text-destructive">{errors.hora_inicio}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Término</label>
                <input
                  type="time"
                  className={dateCls}
                  value={form.hora_fim}
                  onChange={e => setForm(p => ({ ...p, hora_fim: e.target.value }))}
                />
                {errors.hora_fim && (
                  <p className="text-xs text-destructive">{errors.hora_fim}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tempo</label>
                <div className="h-10 rounded-lg border border-input bg-muted/40 px-2.5 text-sm flex items-center font-medium">
                  {form.tipo_aeronave === 'planador'
                    ? `${minutosPlanador} min`
                    : `${form.tempo_decimal.toFixed(1)}h`}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data de vencimento</label>
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
          </CardContent>
        </Card>

        {/* ── Resumo de Valor ──────────────────────────────────────────────── */}
        {valorVoo > 0 && (
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Resumo de Valor
              </p>
              <div className="space-y-1.5 text-sm">
                {selectedAeronave?.tipo === 'planador' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Valor fixo (até {selectedAeronave.tempo_limite} min)
                      </span>
                      <span className="font-medium">{fmt(selectedAeronave.valor_fixo_inicial)}</span>
                    </div>
                    {minutosPlanador > selectedAeronave.tempo_limite && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          +{minutosPlanador - selectedAeronave.tempo_limite} min ×{' '}
                          {fmt(selectedAeronave.valor_por_minuto)}/min
                        </span>
                        <span className="font-medium">
                          {fmt(
                            (minutosPlanador - selectedAeronave.tempo_limite) *
                              selectedAeronave.valor_por_minuto,
                          )}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor/hora</span>
                      <span className="font-medium">{fmt(form.valor_hora)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tempo</span>
                      <span className="font-medium">{form.tempo_decimal.toFixed(1)}h</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t pt-1.5 mt-1">
                  <span className="font-medium">Valor estimado (a receber)</span>
                  <span className="font-semibold text-primary">{fmt(valorVoo)}</span>
                </div>
                {form.instrutor_id && form.taxa_instrutor != null && form.taxa_instrutor > 0 && (
                  <div className="flex justify-between text-muted-foreground border-t pt-1.5">
                    <span>Taxa do instrutor ({form.taxa_instrutor}%) — a pagar</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {fmt(valorInstrutor)}
                    </span>
                  </div>
                )}

                {/* Carteira — só no cadastro, com participante selecionado */}
                {!isEdit && form.participante_id && (
                  <div className="border-t pt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" />
                        Saldo da carteira
                      </span>
                      <span className={cn(
                        'font-medium',
                        participanteSaldo > 0 ? 'text-foreground' : 'text-muted-foreground',
                      )}>
                        {fmt(participanteSaldo)}
                      </span>
                    </div>

                    {participanteSaldo > 0 ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                            checked={usarCarteira}
                            onChange={e => {
                              setUsarCarteira(e.target.checked)
                              if (!e.target.checked) setCarteiraValor('')
                              else setCarteiraValor(carteiraMaxUsavel.toFixed(2))
                            }}
                          />
                          Usar saldo da carteira
                        </label>

                        {usarCarteira && (
                          <div className="pl-6 space-y-1.5">
                            <Input
                              type="number"
                              min={0.01}
                              step={0.01}
                              max={carteiraMaxUsavel}
                              placeholder={carteiraMaxUsavel.toFixed(2)}
                              value={carteiraValor}
                              onChange={e => setCarteiraValor(e.target.value)}
                            />
                            {(() => {
                              const inputNum = parseFloat(carteiraValor) || 0
                              if (inputNum > carteiraMaxUsavel) {
                                return (
                                  <p className="text-xs text-destructive">
                                    Máximo disponível: {fmt(carteiraMaxUsavel)}
                                  </p>
                                )
                              }
                              if (carteiraUsadaNum >= valorVoo) {
                                return (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Saldo suficiente — nenhum título será gerado.
                                  </p>
                                )
                              }
                              if (carteiraUsadaNum > 0) {
                                return (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Título de {fmt(valorTitulo)} será gerado para o valor restante.
                                  </p>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Participante sem saldo na carteira — título será gerado normalmente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir Voo
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/voos')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar Voo'}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este voo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
