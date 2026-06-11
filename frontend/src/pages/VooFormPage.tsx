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
import { getUsers, type User } from '@/services/usersService'
import { createVoo, updateVoo, deleteVoo } from '@/services/voosService'
import { createReceita } from '@/services/receitasService'
import { createCusto } from '@/services/custosService'
import { debitarCarteira } from '@/services/usersService'
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

function calcTempoDecimal(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  const totalMin = h2 * 60 + m2 - (h1 * 60 + m1)
  if (totalMin <= 3) return 0
  return Math.round(Math.ceil((totalMin - 3) / 6) * 10) / 100
}

function calcMinutosPlanador(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
}

function calcValorPlanador(inicio: string, fim: string, aeronave: Aeronave, duplo = false): number {
  const totalMin = calcMinutosPlanador(inicio, fim)
  if (totalMin <= 0) return 0
  const valorFixo = (duplo && aeronave.valor_fixo_duplo != null) ? aeronave.valor_fixo_duplo : aeronave.valor_fixo_inicial
  const valorMinuto = (duplo && aeronave.valor_minuto_duplo != null) ? aeronave.valor_minuto_duplo : aeronave.valor_por_minuto
  if (totalMin <= aeronave.tempo_limite) return valorFixo
  return valorFixo + (totalMin - aeronave.tempo_limite) * valorMinuto
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
  inicio: string
  fim: string
  tempo_decimal: number
  origem: string
  destino: string
  valor_hora: number
  taxa_instrutor: number | null
  data: string
  data_vencimento: string
}

type FormErrors = {
  aeronave_id?: string
  participante_id?: string
  instrutor_id?: string
  inicio?: string
  fim?: string
  data?: string
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
    inicio: '',
    fim: '',
    tempo_decimal: 0,
    origem: '',
    destino: '',
    valor_hora: 0,
    taxa_instrutor: 10,
    data: today,
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

  const [usarCarteira, setUsarCarteira] = useState(false)
  const [carteiraValor, setCarteiraValor] = useState('')
  const [gerarTitulo, setGerarTitulo] = useState(false)

  const autoVencimento = useRef<string>('')

  useEffect(() => {
    Promise.all([getAeronaves(), getUsers()]).then(
      ([avs, us]) => {
        setAeronaves(avs)
        setUsuarios(us)

        if (isEdit) {
          const vooFromState = location.state?.voo as Voo | undefined
          if (!vooFromState) {
            navigate('/voos')
            return
          }
          const initial: FormState = {
            tipo_aeronave: vooFromState.tipo_aeronave,
            aeronave_id: vooFromState.aeronave_id,
            aeronave_nome: vooFromState.aeronave_nome,
            participante_id: vooFromState.participante_id,
            participante_nome: vooFromState.participante_nome,
            instrutor_id: vooFromState.instrutor_id,
            instrutor_nome: vooFromState.instrutor_nome,
            tipo_voo: vooFromState.tipo_voo,
            inicio: vooFromState.inicio,
            fim: vooFromState.fim,
            tempo_decimal: vooFromState.tempo_decimal,
            origem: vooFromState.origem,
            destino: vooFromState.destino,
            valor_hora: vooFromState.valor_hora,
            taxa_instrutor: vooFromState.taxa_instrutor,
            data: vooFromState.data,
            data_vencimento: vooFromState.data_vencimento,
          }
          setForm(initial)
          autoVencimento.current = addOneMonth(initial.data)
        } else {
          autoVencimento.current = addOneMonth(todayStr())
        }

        setLoading(false)
      },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalculate tempo_decimal when inicio/fim change
  useEffect(() => {
    if (form.inicio && form.fim) {
      setForm(p => ({ ...p, tempo_decimal: calcTempoDecimal(form.inicio, form.fim) }))
    }
  }, [form.inicio, form.fim])

  // Update valor_hora when aeronave or tipo_voo changes (avião only)
  useEffect(() => {
    const aeronave = aeronaves.find(a => a.id === form.aeronave_id)
    if (aeronave?.tipo === 'aviao') {
      const isDuplo = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
      setForm(p => ({ ...p, valor_hora: isDuplo ? aeronave.valor_duplo : aeronave.valor_solo }))
    }
  }, [form.aeronave_id, form.tipo_voo, aeronaves])

  // Auto-update data_vencimento when data changes
  useEffect(() => {
    if (!form.data) return
    const auto = addOneMonth(form.data)
    if (form.data_vencimento === autoVencimento.current) {
      setForm(p => ({ ...p, data_vencimento: auto }))
    }
    autoVencimento.current = auto
  }, [form.data])

  // ─── Computed values ────────────────────────────────────────────────────────

  const selectedAeronave = useMemo(
    () => aeronaves.find(a => a.id === form.aeronave_id),
    [aeronaves, form.aeronave_id],
  )

  const valorVoo = useMemo(() => {
    if (!selectedAeronave) return 0
    if (selectedAeronave.tipo === 'planador') {
      const isDuplo = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
      return calcValorPlanador(form.inicio, form.fim, selectedAeronave, isDuplo)
    }
    return form.tempo_decimal * form.valor_hora
  }, [selectedAeronave, form.inicio, form.fim, form.tempo_decimal, form.valor_hora, form.tipo_voo])

  const minutosPlanador = useMemo(
    () => calcMinutosPlanador(form.inicio, form.fim),
    [form.inicio, form.fim],
  )

  const aeronaveOptions = useMemo(
    () =>
      aeronaves
        .filter(a => a.is_active && a.tipo === form.tipo_aeronave)
        .map(a => ({ value: a.id, label: a.nome })),
    [aeronaves, form.tipo_aeronave],
  )

  const participanteOptions = useMemo(() => {
    const perfil = PERFIL_POR_TIPO[form.tipo_voo]
    return usuarios
      .filter(u => u.is_active && u.perfis.includes(perfil))
      .map(u => ({ value: u.id, label: u.nome }))
  }, [form.tipo_voo, usuarios])

  const instrutorOptions = useMemo(
    () =>
      usuarios
        .filter(u => u.is_active && u.perfis.includes('instrutor'))
        .map(u => ({ value: u.id, label: u.nome })),
    [usuarios],
  )

  const precisaInstrutor = TIPOS_VOO_COM_INSTRUTOR.includes(form.tipo_voo)
  const valorInstrutor =
    form.instrutor_id && form.taxa_instrutor != null
      ? valorVoo * (form.taxa_instrutor / 100)
      : 0

  const participanteSaldo = useMemo(
    () => usuarios.find(u => u.id === form.participante_id)?.saldo_carteira ?? 0,
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
    const a = aeronaves.find(a => a.id === aeronaveId)
    setForm(p => ({ ...p, aeronave_id: aeronaveId, aeronave_nome: a?.nome ?? '' }))
  }

  function handleParticipanteChange(uid: string) {
    const u = usuarios.find(u => u.id === uid)
    setForm(p => ({ ...p, participante_id: uid, participante_nome: u?.nome ?? '' }))
    setUsarCarteira(false)
    setCarteiraValor('')
  }

  function handleInstrutorChange(instId: string) {
    const inst = usuarios.find(u => u.id === instId)
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
    if (!form.inicio) e.inicio = 'Informe o horário de início'
    if (!form.fim) e.fim = 'Informe o horário de término'
    if (form.inicio && form.fim) {
      const isPlanador = selectedAeronave?.tipo === 'planador'
      if (isPlanador ? minutosPlanador <= 0 : form.tempo_decimal <= 0)
        e.fim = 'Horário de término deve ser após o início'
    }
    if (!form.data) e.data = 'Data é obrigatória'
    if (!form.data_vencimento) e.data_vencimento = 'Data de vencimento é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const vooData = {
        ...form,
        valor_hora: form.tipo_aeronave === 'planador' ? 0 : form.valor_hora,
        valor_voo: valorVoo,
      }

      if (isEdit && id) {
        await updateVoo(id, vooData)
      } else {
        const voo = await createVoo(vooData)

        const tempoDisplay =
          voo.tipo_aeronave === 'planador'
            ? `${minutosPlanador}min`
            : `${voo.tempo_decimal.toFixed(1)}h`
        const descricaoVoo = `${TIPO_VOO_LABELS[voo.tipo_voo]} – ${tempoDisplay} – ${voo.aeronave_nome}`

        // Debit wallet if used
        if (carteiraUsadaNum > 0) {
          await debitarCarteira(voo.participante_id, carteiraUsadaNum)
        }

        if (valorTitulo > 0) {
          // Parte/total via carteira → gera uma RECEITA pendente do valor restante.
          // O operador decide depois se ela vira título a receber (faturar).
          const descricaoFinal =
            carteiraUsadaNum > 0
              ? `${descricaoVoo} (${fmt(carteiraUsadaNum)} via carteira)`
              : descricaoVoo
          await createReceita({
            participante_id: voo.participante_id,
            tipo: 'voo',
            descricao: descricaoFinal,
            valor: valorTitulo,
            data_emissao: voo.data,
            data_vencimento: voo.data_vencimento,
            gerar_titulo: gerarTitulo,
          })
        }
        // Se valorTitulo <= 0, pagamento coberto pela carteira — nenhuma receita necessária.

        // Custo do instrutor: para PLANADOR o backend já gera o repasse (Custo + título);
        // aqui tratamos apenas AVIÃO, evitando duplicidade.
        if (
          voo.tipo_aeronave === 'aviao' &&
          voo.instrutor_id && voo.instrutor_nome &&
          voo.taxa_instrutor && voo.taxa_instrutor > 0
        ) {
          await createCusto({
            tipo: 'folha_pagamento',
            favorecido: voo.instrutor_id,
            descricao: `Instrução – ${descricaoVoo}`,
            valor: voo.valor_voo * (voo.taxa_instrutor / 100),
            data_emissao: voo.data,
            data_vencimento: voo.data_vencimento,
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
      await deleteVoo(id)
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
        <Card className="overflow-visible">
          <CardContent className="p-6 space-y-4 overflow-visible">
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
              <div className="rounded-lg border border-border bg-muted/30 overflow-hidden text-sm">
                {selectedAeronave.foto && (
                  <img
                    src={selectedAeronave.foto}
                    alt={selectedAeronave.nome}
                    loading="lazy"
                    className="w-full h-36 object-cover border-b border-border"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                <div className="px-4 py-3">
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
                        Usuário sem saldo na carteira — título será gerado normalmente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Título a Receber ─────────────────────────────────────────────── */}
        {!isEdit && valorTitulo > 0 && (
          <Card>
            <CardContent className="px-6 py-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gerarTitulo}
                  onChange={e => setGerarTitulo(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">Gerar título a receber diretamente</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se marcado, cria o título em aberto ({fmt(valorTitulo)}) agora. Caso contrário, cria uma receita pendente para faturar depois.
                  </p>
                </div>
              </label>
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
