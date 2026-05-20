import { useState, useEffect } from 'react'
import { Pencil, CircleDollarSign, Trash2, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  type TituloReceber,
  type TituloReceberStatus,
  TITULO_RECEBER_TIPO_LABELS,
} from '@/mocks/titulos'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const isAtrasado = (t: TituloReceber) =>
  t.status !== 'baixado' && new Date(t.data_vencimento + 'T00:00:00') < new Date()

const STATUS_LABELS: Record<TituloReceberStatus, string> = {
  em_aberto: 'Em aberto',
  pago_parcial: 'Pago parcial',
  baixado: 'Baixado',
}

const STATUS_COLORS: Record<TituloReceberStatus, string> = {
  em_aberto: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pago_parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  baixado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const TIPO_COLORS: Record<string, string> = {
  mensalidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  pontual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  servico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  voo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  carteira: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

interface Props {
  titulo: TituloReceber | null
  allTitulos: TituloReceber[]
  open: boolean
  onClose: () => void
  onEdit: (t: TituloReceber) => void
  onBaixa: (t: TituloReceber) => void
  onDeleteRequest: (t: TituloReceber) => void
}

export function TituloReceberDetailModal({
  titulo,
  allTitulos,
  open,
  onClose,
  onEdit,
  onBaixa,
  onDeleteRequest,
}: Props) {
  const [current, setCurrent] = useState<TituloReceber | null>(titulo)

  useEffect(() => {
    if (titulo) setCurrent(titulo)
  }, [titulo])

  if (!current) return null

  const atrasado = isAtrasado(current)
  const isCarteira = current.tipo === 'carteira'
  const restante = current.valor + (current.multa ?? 0) - current.valor_pago

  const siblings =
    current.total_parcelas > 1
      ? allTitulos
          .filter(
            t =>
              t.id !== current.id &&
              t.usuario_nome === current.usuario_nome &&
              t.tipo === current.tipo &&
              t.descricao === current.descricao &&
              t.total_parcelas === current.total_parcelas,
          )
          .sort((a, b) => a.num_parcela - b.num_parcela)
      : []

  const allParcelas =
    siblings.length > 0
      ? [...siblings, current].sort((a, b) => a.num_parcela - b.num_parcela)
      : []

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                TIPO_COLORS[current.tipo],
              )}
            >
              {TITULO_RECEBER_TIPO_LABELS[current.tipo]}
            </span>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                atrasado
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  : STATUS_COLORS[current.status],
              )}
            >
              {atrasado ? 'Em atraso' : STATUS_LABELS[current.status]}
            </span>
            {current.total_parcelas > 1 && (
              <span className="text-xs text-muted-foreground">
                Parcela {current.num_parcela}/{current.total_parcelas}
              </span>
            )}
          </div>
          <DialogTitle className="text-base leading-snug">{current.usuario_nome}</DialogTitle>
          <p className="text-sm text-muted-foreground">{current.descricao}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border text-sm">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                <p className="font-medium">{fmt(current.valor)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Valor pago</p>
                <p className="font-medium">{fmt(current.valor_pago)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {current.status === 'baixado' ? 'Multa' : 'Saldo restante'}
                </p>
                <p
                  className={cn(
                    'font-medium',
                    current.status !== 'baixado'
                      ? ''
                      : (current.multa ?? 0) > 0
                      ? 'text-rose-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {current.status === 'baixado'
                    ? (current.multa ?? 0) > 0
                      ? fmt(current.multa!)
                      : '—'
                    : fmt(restante)}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Via carteira</p>
                <p
                  className={cn(
                    'font-medium',
                    (current.valor_carteira ?? 0) > 0 ? 'text-teal-600' : 'text-muted-foreground',
                  )}
                >
                  {(current.valor_carteira ?? 0) > 0 ? fmt(current.valor_carteira!) : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Emissão</p>
                <p>{fmtDate(current.data_emissao)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Vencimento</p>
                <p className={cn(atrasado && 'text-rose-500 font-medium')}>
                  {fmtDate(current.data_vencimento)}
                </p>
              </div>
            </div>

            {current.status === 'baixado' && current.data_pagamento && (
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Recebido em</p>
                <p className="text-emerald-600 font-medium">{fmtDate(current.data_pagamento)}</p>
              </div>
            )}
          </div>

          {allParcelas.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Parcelas da série
              </p>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {allParcelas.map(p => {
                  const pAtrasado = isAtrasado(p)
                  const isCurrent = p.id === current.id
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm',
                        isCurrent && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 text-xs font-semibold shrink-0',
                          isCurrent ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        #{p.num_parcela}
                      </span>
                      <span
                        className={cn(
                          'flex-1 text-muted-foreground',
                          pAtrasado && 'text-rose-500',
                        )}
                      >
                        {fmtDate(p.data_vencimento)}
                      </span>
                      <span className="font-medium whitespace-nowrap">{fmt(p.valor)}</span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                          pAtrasado
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            : STATUS_COLORS[p.status],
                        )}
                      >
                        {pAtrasado ? 'Atraso' : STATUS_LABELS[p.status]}
                      </span>
                      {!isCurrent && (
                        <button
                          onClick={() => setCurrent(p)}
                          className="ml-0.5 rounded p-1 hover:bg-muted transition-colors"
                          title={`Ver parcela #${p.num_parcela}`}
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center gap-2">
            {!isCarteira && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                onClick={() => onDeleteRequest(current)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {!isCarteira && (
                <Button variant="outline" onClick={() => onEdit(current)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
              {current.status !== 'baixado' && !isCarteira && (
                <Button onClick={() => onBaixa(current)}>
                  <CircleDollarSign className="h-3.5 w-3.5" />
                  Dar baixa
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
