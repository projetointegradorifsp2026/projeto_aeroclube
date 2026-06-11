import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type TituloResumo } from '@/mocks/financeiroOrigem'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

function StatusBadge({ status, atrasado }: { status: string; atrasado: boolean }) {
  if (status === 'baixado') return <Badge variant="success">Pago</Badge>
  if (atrasado) return <Badge variant="destructive">Atrasado</Badge>
  return <Badge variant="outline" className="text-muted-foreground">Em aberto</Badge>
}

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  descricao?: string
  titulos: TituloResumo[]
}

export function TitulosRelacionadosModal({ open, onClose, titulo, descricao, titulos }: Props) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && (
            <DialogDescription>{descricao}</DialogDescription>
          )}
        </DialogHeader>

        {titulos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum título gerado ainda.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Parcela</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Pago</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Pagamento</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {titulos.map(t => (
                  <tr key={t.id} className={cn('hover:bg-muted/20', t.status === 'baixado' && 'opacity-75')}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {t.num_parcela}/{t.total_parcelas}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{fmt(t.valor)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {t.valor_pago !== null && t.valor_pago > 0
                        ? <span className="text-emerald-600 dark:text-emerald-400">{fmt(t.valor_pago)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(t.data_vencimento)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {t.data_pagamento ? fmtDate(t.data_pagamento) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={t.status} atrasado={t.esta_atrasado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
