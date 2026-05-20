import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Aeronave } from '@/services/aeronavesService'

export interface CarteiraLancamento {
  id: string
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
}

interface SaldoHorasModalProps {
  open: boolean
  onClose: () => void
  lancamentos: CarteiraLancamento[]
  aeronaves: Aeronave[]
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

function fmtMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = Math.floor(minutos % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}min`
}

interface AeronaveRow {
  aeronave: Aeronave
  solo?: string
  duplo?: string
  minutos?: string
  insuficiente?: boolean
}

function calcAeronaveRow(aeronave: Aeronave, valor: number): AeronaveRow {
  if (aeronave.tipo === 'aviao') {
    const solo = aeronave.valor_solo > 0
      ? fmtMinutos((valor / aeronave.valor_solo) * 60)
      : undefined
    const duplo = aeronave.valor_duplo > 0
      ? fmtMinutos((valor / aeronave.valor_duplo) * 60)
      : undefined
    return { aeronave, solo, duplo }
  }
  if (valor < aeronave.valor_fixo_inicial) {
    return { aeronave, insuficiente: true }
  }
  const minTotal =
    aeronave.valor_por_minuto > 0
      ? aeronave.tempo_limite + (valor - aeronave.valor_fixo_inicial) / aeronave.valor_por_minuto
      : aeronave.tempo_limite
  return { aeronave, minutos: fmtMinutos(minTotal) }
}

export function SaldoHorasModal({
  open,
  onClose,
  lancamentos,
  aeronaves,
}: SaldoHorasModalProps) {
  const activeAeronaves = aeronaves.filter(a => a.is_active)

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Saldo em Horas de Voo
          </DialogTitle>
          <DialogDescription>
            Equivalência de cada lançamento em horas de voo por aeronave.
          </DialogDescription>
        </DialogHeader>

        {lancamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum crédito registrado na carteira.
          </p>
        ) : (
          <div className="space-y-3">
            {lancamentos.map(l => (
              <div key={l.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium truncate">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(l.data_emissao)} · Venc.: {fmtDate(l.data_vencimento)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {fmt(l.valor)}
                  </span>
                </div>

                {activeAeronaves.length > 0 && (
                  <div className="border-t border-border pt-2 space-y-1">
                    {activeAeronaves.map(a => {
                      const row = calcAeronaveRow(a, l.valor)
                      return (
                        <div key={a.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {a.nome}{' '}
                            <span className="text-muted-foreground/60">
                              ({a.tipo === 'aviao' ? 'Avião' : 'Planador'})
                            </span>
                          </span>
                          <span className="text-right">
                            {row.insuficiente ? (
                              <span className="text-muted-foreground">
                                insuf. (mín. {fmt(a.valor_fixo_inicial)})
                              </span>
                            ) : a.tipo === 'aviao' ? (
                              <span className="space-x-2">
                                {row.solo && <span>Solo: {row.solo}</span>}
                                {row.duplo && <span className="text-muted-foreground">Duplo: {row.duplo}</span>}
                              </span>
                            ) : (
                              <span>{row.minutos}</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
