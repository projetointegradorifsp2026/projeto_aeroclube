import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchSelect } from '@/components/ui/search-select'
import type { Aeronave } from '@/services/aeronavesService'

export interface AddSaldoData {
  valor: number
  data_transacao: string
  data_vencimento: string
  descricao: string
}

interface AdicionarSaldoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: AddSaldoData) => Promise<void>
  aeronaves: Aeronave[]
  currentSaldo: number
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const todayStr = () => new Date().toISOString().split('T')[0]
const sixMonthsStr = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().split('T')[0]
}

function horasToDisplay(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}min`
}

function calcTempoFromValor(aeronave: Aeronave, valor: number, tipoTarifa: 'solo' | 'duplo'): number | null {
  if (aeronave.tipo === 'aviao') {
    const tarifa = tipoTarifa === 'solo' ? aeronave.valor_solo : aeronave.valor_duplo
    if (!tarifa) return null
    return valor / tarifa
  }
  if (valor < aeronave.valor_fixo_inicial) return aeronave.tempo_limite
  if (!aeronave.valor_por_minuto) return aeronave.tempo_limite
  return aeronave.tempo_limite + (valor - aeronave.valor_fixo_inicial) / aeronave.valor_por_minuto
}

function calcValorFromTempo(aeronave: Aeronave, tempo: number, tipoTarifa: 'solo' | 'duplo'): number {
  if (aeronave.tipo === 'aviao') {
    const tarifa = tipoTarifa === 'solo' ? aeronave.valor_solo : aeronave.valor_duplo
    return tempo * tarifa
  }
  if (tempo <= aeronave.tempo_limite) return aeronave.valor_fixo_inicial
  return aeronave.valor_fixo_inicial + (tempo - aeronave.tempo_limite) * aeronave.valor_por_minuto
}

export function AdicionarSaldoModal({
  open,
  onClose,
  onSave,
  aeronaves,
  currentSaldo,
}: AdicionarSaldoModalProps) {
  const [tab, setTab] = useState<'dinheiro' | 'horas'>('dinheiro')
  const [dataTransacao, setDataTransacao] = useState(todayStr())
  const [dataVencimento, setDataVencimento] = useState(sixMonthsStr())
  const [saving, setSaving] = useState(false)

  // Tab dinheiro
  const [valor, setValor] = useState('')

  // Tab horas
  const [aeronaveId, setAeronaveId] = useState('')
  const [tipoTarifa, setTipoTarifa] = useState<'solo' | 'duplo'>('solo')
  const [valorHoras, setValorHoras] = useState('')
  const [tempo, setTempo] = useState('')

  const activeAeronaves = aeronaves.filter(a => a.is_active)
  const selectedAeronave = activeAeronaves.find(a => a.id === aeronaveId)

  useEffect(() => {
    if (!open) return
    setTab('dinheiro')
    setDataTransacao(todayStr())
    setDataVencimento(sixMonthsStr())
    setValor('')
    setAeronaveId('')
    setTipoTarifa('solo')
    setValorHoras('')
    setTempo('')
  }, [open])

  // Recalcula tempo quando tarifa muda (mantém valor como fonte)
  useEffect(() => {
    if (!selectedAeronave || selectedAeronave.tipo !== 'aviao') return
    const v = parseFloat(valorHoras)
    if (!v || v <= 0) return
    const t = calcTempoFromValor(selectedAeronave, v, tipoTarifa)
    if (t !== null) setTempo(t.toFixed(2))
  }, [tipoTarifa]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAeronaveChange(id: string) {
    setAeronaveId(id)
    setValorHoras('')
    setTempo('')
    setTipoTarifa('solo')
  }

  function handleValorHorasChange(raw: string) {
    setValorHoras(raw)
    if (!selectedAeronave) return
    const v = parseFloat(raw)
    if (!v || v <= 0) { setTempo(''); return }
    const t = calcTempoFromValor(selectedAeronave, v, tipoTarifa)
    setTempo(t !== null ? t.toFixed(2) : '')
  }

  function handleTempoChange(raw: string) {
    setTempo(raw)
    if (!selectedAeronave) return
    const t = parseFloat(raw)
    if (!t || t <= 0) { setValorHoras(''); return }
    const v = calcValorFromTempo(selectedAeronave, t, tipoTarifa)
    setValorHoras(v.toFixed(2))
  }

  function buildDescricao(): string {
    if (tab === 'dinheiro') return 'Recarga de carteira'
    if (!selectedAeronave) return 'Recarga de carteira'
    const tempoNum = parseFloat(tempo) || 0
    if (selectedAeronave.tipo === 'aviao') {
      const tarifaLabel = tipoTarifa === 'solo' ? 'solo' : 'duplo'
      return `Recarga de carteira – ${horasToDisplay(tempoNum)} ${selectedAeronave.nome} (${tarifaLabel})`
    }
    return `Recarga de carteira – ${Math.round(tempoNum)}min ${selectedAeronave.nome}`
  }

  async function handleSubmit() {
    const v = tab === 'dinheiro' ? parseFloat(valor) : parseFloat(valorHoras)
    if (!v || v <= 0 || !dataTransacao || !dataVencimento) return
    setSaving(true)
    try {
      await onSave({
        valor: v,
        data_transacao: dataTransacao,
        data_vencimento: dataVencimento,
        descricao: buildDescricao(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const effectiveValor = tab === 'dinheiro' ? (parseFloat(valor) || 0) : (parseFloat(valorHoras) || 0)
  const isDisabled =
    saving ||
    effectiveValor <= 0 ||
    !dataTransacao ||
    !dataVencimento ||
    (tab === 'horas' && !aeronaveId)

  const aeronaveOptions = activeAeronaves.map(a => ({
    value: a.id,
    label: `${a.nome} (${a.tipo === 'aviao' ? 'Avião' : 'Planador'})`,
  }))

  const tempoStep = selectedAeronave?.tipo === 'planador' ? 1 : 0.01
  const tempoLabel = selectedAeronave?.tipo === 'planador' ? 'Minutos de Voo' : 'Horas de Voo'

  const tempoDisplay =
    tempo && selectedAeronave?.tipo === 'aviao'
      ? horasToDisplay(parseFloat(tempo) || 0)
      : null

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Saldo</DialogTitle>
          <DialogDescription>
            Um título baixado será gerado como comprovante do crédito adicionado.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as 'dinheiro' | 'horas')} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="dinheiro" className="flex-1">Dinheiro</TabsTrigger>
            <TabsTrigger value="horas" className="flex-1">Por Horas de Voo</TabsTrigger>
          </TabsList>

          <TabsContent value="dinheiro" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor a adicionar (R$)</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="horas" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aeronave</label>
              <SearchSelect
                options={aeronaveOptions}
                value={aeronaveId}
                onChange={handleAeronaveChange}
                placeholder="Selecione a aeronave..."
              />
            </div>

            {selectedAeronave?.tipo === 'aviao' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Tarifa</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="tipoTarifa"
                      value="solo"
                      checked={tipoTarifa === 'solo'}
                      onChange={() => setTipoTarifa('solo')}
                      className="accent-primary"
                    />
                    Solo ({fmt(selectedAeronave.valor_solo)}/h)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="tipoTarifa"
                      value="duplo"
                      checked={tipoTarifa === 'duplo'}
                      onChange={() => setTipoTarifa('duplo')}
                      className="accent-primary"
                    />
                    Duplo ({fmt(selectedAeronave.valor_duplo)}/h)
                  </label>
                </div>
              </div>
            )}

            {selectedAeronave?.tipo === 'planador' && (
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
                Pacote base: {fmt(selectedAeronave.valor_fixo_inicial)} por {selectedAeronave.tempo_limite}min
                {selectedAeronave.valor_por_minuto > 0 && (
                  <> · Adicional: {fmt(selectedAeronave.valor_por_minuto)}/min</>
                )}
              </div>
            )}

            {aeronaveId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valor (R$)</label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="0,00"
                    value={valorHoras}
                    onChange={e => handleValorHorasChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tempoLabel}</label>
                  <Input
                    type="number"
                    min={0.01}
                    step={tempoStep}
                    placeholder="0"
                    value={tempo}
                    onChange={e => handleTempoChange(e.target.value)}
                  />
                  {tempoDisplay && (
                    <p className="text-xs text-muted-foreground">= {tempoDisplay}</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data da transação</label>
            <Input
              type="date"
              value={dataTransacao}
              onChange={e => setDataTransacao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vencimento</label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
            />
          </div>
        </div>

        {effectiveValor > 0 && (
          <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Saldo atual: </span>
            <span className="font-medium">{fmt(currentSaldo)}</span>
            <span className="text-muted-foreground mx-1.5">→</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {fmt(currentSaldo + effectiveValor)}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled}>
            {saving ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
