import { useEffect, useState, useMemo, useRef } from 'react'
import {
  FileText,
  FileUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getConfiguracoesBancarias,
  getTitulosAbertosParaRemessa,
  getRemessas,
  getRetornos,
  gerarRemessa,
  baixarRemessa,
  processarRetorno,
  type ConfiguracaoBancaria,
  type TituloAberto,
  type RemessaCNAB,
  type RetornoCNAB,
  type ProcessarRetornoResp,
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

  // Importação do retorno (.RET)
  const retFileRef = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)
  const [retErro, setRetErro] = useState('')
  const [retResultado, setRetResultado] = useState<ProcessarRetornoResp | null>(null)

  async function handleProcessarRetorno(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!config?.id) {
      setRetErro('Cadastre a configuração bancária antes de importar o retorno.')
      return
    }
    setProcessando(true)
    setRetErro('')
    setRetResultado(null)
    try {
      const resp = await processarRetorno(config.id, file)
      setRetResultado(resp)
      const rets = await getRetornos()
      setRetornos(rets)
      // títulos liquidados saem da lista de abertos → recarrega
      setTitulos(await getTitulosAbertosParaRemessa())
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      let msg = raw
      try {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object' && typeof o.detail === 'string') msg = o.detail
      } catch {
        /* não era JSON */
      }
      setRetErro(msg || 'Erro ao processar o arquivo de retorno.')
    } finally {
      setProcessando(false)
    }
  }

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

  const [activeTab, setActiveTab] = useState<'gerar' | 'remessas' | 'retornos'>('gerar')
  const noTitulos = !loading && titulos.length === 0
  const noRemessas = !loading && remessas.length === 0
  const noRetornos = !loading && retornos.length === 0
  const hasNoData =
    (activeTab === 'gerar' && noTitulos) ||
    (activeTab === 'remessas' && noRemessas) ||
    (activeTab === 'retornos' && noRetornos)

  return (
    <div className={cn("pt-2 flex flex-col gap-6", hasNoData && "flex-1")}>
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

      <Tabs defaultValue="gerar" className="flex-1" onValueChange={v => setActiveTab(v as 'gerar' | 'remessas' | 'retornos')}>
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
        <TabsContent value="gerar" className={cn(noTitulos && "flex flex-col")}>
          <Card className={cn("flex flex-col", noTitulos && "flex-1")}>
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
            <CardContent className={cn("p-0 flex flex-col", noTitulos && "flex-1")}>
              {erro && <div className="px-4 py-2 text-sm text-rose-600 border-b">{erro}</div>}
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : titulos.length === 0 ? (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia><FileText className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                    <EmptyTitle>Nenhum título em aberto para remessa</EmptyTitle>
                    <EmptyDescription>Aguarde títulos serem cadastrados para gerar remessas</EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
        <TabsContent value="remessas" className={cn(noRemessas && "flex flex-col")}>
          <Card className={cn("flex flex-col", noRemessas && "flex-1")}>
            <CardContent className={cn("p-0 flex flex-col", noRemessas && "flex-1")}>
              {remessas.length === 0 ? (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia><FileText className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                    <EmptyTitle>Nenhuma remessa gerada</EmptyTitle>
                    <EmptyDescription>Gere remessas a partir dos títulos em aberto</EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
        <TabsContent value="retornos" className={cn(noRetornos ? "flex flex-col gap-4" : "space-y-4")}>
          {/* Importar arquivo de retorno (.RET) */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Importar retorno do banco (.RET)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Envie o arquivo de retorno do Sicoob. As ocorrências de liquidação dão{' '}
                <strong>baixa automática</strong> nos títulos correspondentes.
              </p>
              <input
                ref={retFileRef}
                type="file"
                accept=".ret,.RET,.txt,text/plain"
                className="hidden"
                onChange={handleProcessarRetorno}
              />
              <Button
                onClick={() => retFileRef.current?.click()}
                disabled={processando || !config?.id}
              >
                <Upload className="h-4 w-4" />
                {processando ? 'Processando...' : 'Selecionar arquivo .RET'}
              </Button>
              {retErro && <p className="text-sm text-rose-600">{retErro}</p>}

              {retResultado && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Retorno processado ({retResultado.nome_arquivo || 'arquivo'}).
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Ocorrências', value: retResultado.resumo.itens, cls: 'text-foreground' },
                      { label: 'Baixados', value: retResultado.resumo.baixados, cls: 'text-emerald-600' },
                      { label: 'Sem título', value: retResultado.resumo.sem_titulo, cls: 'text-amber-600' },
                      { label: 'Ignorados', value: retResultado.resumo.ignorados, cls: 'text-muted-foreground' },
                    ].map(c => (
                      <div key={c.label} className="rounded-lg border border-border px-3 py-2">
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={cn('text-xl font-bold', c.cls)}>{c.value}</p>
                      </div>
                    ))}
                  </div>
                  {retResultado.itens.length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nosso número</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ocorrência</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Pago em</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {retResultado.itens.map(it => (
                            <tr key={it.id}>
                              <td className="px-3 py-2 font-mono text-xs">{it.nosso_numero || '—'}</td>
                              <td className="px-3 py-2">
                                <span className="text-muted-foreground">{it.codigo_ocorrencia}</span>{' '}
                                {it.descricao_ocorrencia}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {it.data_pagamento ? fmtDate(it.data_pagamento) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                {it.valor_pago ? fmt(parseFloat(it.valor_pago)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn("flex flex-col", noRetornos && "flex-1")}>
            <CardContent className={cn("p-0 flex flex-col", noRetornos && "flex-1")}>
              {retornos.length === 0 ? (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia><FileText className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                    <EmptyTitle>Nenhum retorno importado</EmptyTitle>
                    <EmptyDescription>Importe arquivos de retorno CNAB para processar pagamentos</EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
