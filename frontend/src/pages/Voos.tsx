import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TablePagination } from '@/components/ui/pagination'
import { Search, Plus, Pencil, Trash2, Plane } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getVoos, deleteVoo, type Voo } from '@/services/voosService'
import { getAeronaves, type Aeronave } from '@/services/aeronavesService'
import { TIPO_VOO_LABELS, type TipoVoo, ALL_TIPOS_VOO } from '@/mocks/voos'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const TIPO_VOO_COLORS: Record<TipoVoo, string> = {
  instrucao_solo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  instrucao_duplo: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  socio_solo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  socio_duplo: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  externo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function Voos() {
  const navigate = useNavigate()

  const [voos, setVoos] = useState<Voo[]>([])
  const [aeronaves, setAeronaves] = useState<Aeronave[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoVoo | 'all'>('all')
  const [aeronaveFilter, setAeronaveFilter] = useState<string>('all')

  const [deleteTarget, setDeleteTarget] = useState<Voo | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, tipoFilter, aeronaveFilter])

  useEffect(() => {
    Promise.all([getVoos(), getAeronaves()]).then(([vs, avs]) => {
      setVoos(vs)
      setAeronaves(avs)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return voos
      .filter(v => {
        const matchSearch =
          !q ||
          v.participante_nome.toLowerCase().includes(q) ||
          v.aeronave_nome.toLowerCase().includes(q) ||
          (v.instrutor_nome?.toLowerCase().includes(q) ?? false)
        const matchTipo = tipoFilter === 'all' || v.tipo_voo === tipoFilter
        const matchAeronave = aeronaveFilter === 'all' || v.aeronave_id === aeronaveFilter
        return matchSearch && matchTipo && matchAeronave
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.inicio.localeCompare(a.inicio))
  }, [voos, search, tipoFilter, aeronaveFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteVoo(deleteTarget.id)
    setVoos(prev => prev.filter(v => v.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro e controle de todos os voos realizados
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className={cn(inputCls, 'w-full pl-8 pr-3')}
            placeholder="Buscar por participante, aeronave ou instrutor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputCls}
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value as TipoVoo | 'all')}
        >
          <option value="all">Todos os tipos</option>
          {ALL_TIPOS_VOO.map(t => (
            <option key={t} value={t}>
              {TIPO_VOO_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={aeronaveFilter}
          onChange={e => setAeronaveFilter(e.target.value)}
        >
          <option value="all">Todas as aeronaves</option>
          {aeronaves.map(a => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <Button onClick={() => navigate('/voos/novo')} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Registrar Voo
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} voo${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Plane className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum voo encontrado</p>
              <p className="text-xs mt-1">Registre voos para começar o diário de bordo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Participante</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Instrutor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Aeronave</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tempo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(v => (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-medium">{fmtDate(v.data)}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.inicio} – {v.fim}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            TIPO_VOO_COLORS[v.tipo_voo],
                          )}
                        >
                          {TIPO_VOO_LABELS[v.tipo_voo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{v.participante_nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {v.instrutor_nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{v.aeronave_nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {v.tipo_aeronave === 'planador'
                          ? `${Math.round(v.tempo_decimal * 60)}min`
                          : `${v.tempo_decimal.toFixed(1)}h`}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {fmt(v.valor_voo)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/voos/${v.id}/editar`, { state: { voo: v } })}
                            title="Editar voo"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(v)}
                            title="Excluir voo"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o voo de{' '}
              <strong className="text-foreground">{deleteTarget?.participante_nome}</strong> em{' '}
              {deleteTarget && fmtDate(deleteTarget.data)}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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
