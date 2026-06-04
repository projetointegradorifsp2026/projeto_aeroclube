import { useEffect, useState, useMemo } from 'react'
import { FileText, FileUp, ChevronDown, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getConfiguracoesBancarias,
  getTitulosAbertosParaRemessa,
  getRemessas,
  getRetornos,
  gerarRemessa,
  baixarRemessa,
  type ConfiguracaoBancaria,
  type TituloAberto,
  type RemessaCNAB,
  type RetornoCNAB,
} from '@/services/cnabService'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const STATUS_COLORS: Record<string, string> = {
  gerada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  enviada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  erro: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  importado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export default function RemessasCNAB() {
  const [config, setConfig] = useState<ConfiguracaoBancaria | null>(null)
  const [titulos, setTitulos] = useState<TituloAberto[]>([])
  const [remessas, setRemessas] = useState<RemessaCNAB[]>([])
  const [retornos, setRetornos] = useState<RetornoCNAB[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [erro, setErro] = useState('')

  async function reload() {
    const [cfgs, tits, rems, rets] = await Promise.all([
      getConfiguracoesBancarias(),
      getTitulosAbertosParaRemessa(),
      getRemessas(),
      getRetornos(),
    ])
    setConfig(cfgs[0] ?? null)
    setTitulos(tits)
    setRemessas(rems)
    setRetornos(rets)
  }

  useEffect(() => {
    reload().catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalSelecionado = useMemo(
    () => titulos.filter(t => selected.has(t.id)).reduce((s, t) => s + parseFloat(t.saldo_devedor), 0),
    [titulos, selected],
  )

  function toggle(id: number) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleAll() {
    setSelected(prev => (prev.size === titulos.length ? new Set() : new Set(titulos.map(t => t.id))))
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function handleGerar() {
    if (!config?.id || selected.size === 0) return
    setGerando(true)
    setErro('')
    try {
      await gerarRemessa(config.id, Array.from(selected))
      setSelected(new Set())
      await reload()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar remessa.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Remessas CNAB</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selecione títulos a receber em aberto e gere o arquivo de remessa de cobrança (Sicoob).
        </p>
      </div>

      {!loading && !config && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Nenhuma configuração bancária cadastrada. Configure o cedente em "Configuração Bancária" antes de gerar remessas.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="gerar">
        <TabsList>
          <TabsTrigger value="gerar">Gerar remessa</TabsTrigger>
          <TabsTrigger value="remessas">
            Remessas{remessas.length > 0 && <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs font-medium">{remessas.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="retornos">
            Retornos{retornos.length > 0 && <span className="ml-1.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-xs font-medium">{retornos.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* GERAR */}
        <TabsContent value="gerar">
          <Card>
            <CardHeader className="border-b pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {titulos.length} título{titulos.length !== 1 ? 's' : ''} em aberto
              </CardTitle>
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selected.size} selecionado{selected.size !== 1 ? 's' : ''} · {fmt(totalSelecionado)}
                  </span>
                )}
                <Button onClick={handleGerar} disabled={gerando || selected.size === 0 || !config?.id}>
                  <FileUp className="h-4 w-4" />
                  {gerando ? 'Gerando...' : 'Gerar remessa'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {erro && <div className="px-4 py-2 text-sm text-rose-600 border-b">{erro}</div>}
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : titulos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum título em aberto para remessa</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox" className="h-4 w-4 accent-primary"
                          checked={selected.size === titulos.length && titulos.length > 0}
                          onChange={toggleAll} />
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Devedor</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulos.map(t => (
                      <tr key={t.id} className={cn('border-b last:border-0 hover:bg-muted/20', selected.has(t.id) && 'bg-primary/5')}>
                        <td className="px-4 py-3">
                          <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{t.participante_nome}</td>
                        <td className="px-4 py-3 max-w-[280px] truncate">{t.descricao}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{fmtDate(t.data_vencimento)}</td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{fmt(parseFloat(t.saldo_devedor))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REMESSAS */}
        <TabsContent value="remessas">
          <Card>
            <CardContent className="p-0">
              {remessas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma remessa gerada</p>
                </div>
              ) : (
                <div className="divide-y">
                  {remessas.map(r => (
                    <div key={r.id}>
                      <div className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/20">
                        <button onClick={() => toggleExpand(r.id)} className="flex flex-1 items-center gap-3 text-left">
                          {expanded.has(r.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <span className="font-medium">Remessa #{r.numero_sequencial}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[r.status] ?? 'bg-muted')}>{r.status_display}</span>
                          <span className="text-sm text-muted-foreground">{fmtDate(r.data_geracao)}</span>
                          <span className="ml-auto text-sm text-muted-foreground">{r.quantidade_titulos} título(s)</span>
                          <span className="font-medium">{fmt(parseFloat(r.valor_total))}</span>
                        </button>
                        <Button size="sm" variant="outline" onClick={() => baixarRemessa(r.id, r.nome_arquivo)} title="Baixar arquivo .REM">
                          <Download className="h-3.5 w-3.5" />
                          .REM
                        </Button>
                      </div>
                      {expanded.has(r.id) && (
                        <div className="bg-muted/20 px-12 py-2">
                          <p className="text-xs text-muted-foreground mb-1">Arquivo: {r.nome_arquivo || '—'}</p>
                          <ul className="text-sm divide-y">
                            {r.itens.map(it => (
                              <li key={it.id} className="flex justify-between py-1.5">
                                <span className="text-muted-foreground truncate">{it.titulo_descricao}</span>
                                <span className="font-medium whitespace-nowrap ml-3">{fmt(parseFloat(it.valor))}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETORNOS */}
        <TabsContent value="retornos">
          <Card>
            <CardContent className="p-0">
              {retornos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum retorno importado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {retornos.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{fmtDate(r.data_retorno)}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[r.status] ?? 'bg-muted')}>{r.status_display}</span>
                      <span className="ml-auto text-sm text-muted-foreground">{r.nome_arquivo || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
