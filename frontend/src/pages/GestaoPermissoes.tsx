import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlert } from '@/components/feedback/alert-provider'
import {
  getMatriz,
  salvarMatriz,
  type MatrizPermissoes,
  type PermissaoMatrizItem,
} from '@/services/permissoesService'
import { cn } from '@/lib/utils'

const cellKey = (perfil: string, chave: string) => `${perfil}__${chave}`

export default function GestaoPermissoes() {
  const alert = useAlert()
  const [data, setData] = useState<MatrizPermissoes | null>(null)
  const [cells, setCells] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  function aplicar(m: MatrizPermissoes) {
    setData(m)
    const next: Record<string, boolean> = {}
    m.matriz.forEach(it => { next[cellKey(it.perfil, it.funcionalidade)] = it.permitido })
    setCells(next)
  }

  useEffect(() => {
    getMatriz()
      .then(aplicar)
      .catch(() => alert.error('Erro ao carregar as permissões.'))
      .finally(() => setLoading(false))
  }, [alert])

  const perfisNaoAdmin = useMemo(
    () => (data ? data.perfis.filter(p => p.chave !== data.perfil_admin) : []),
    [data],
  )

  function toggle(perfil: string, chave: string) {
    const k = cellKey(perfil, chave)
    setCells(prev => ({ ...prev, [k]: !prev[k] }))
  }

  async function handleSalvar() {
    if (!data) return
    setSaving(true)
    try {
      const itens: PermissaoMatrizItem[] = []
      perfisNaoAdmin.forEach(p =>
        data.funcionalidades.forEach(f =>
          itens.push({ perfil: p.chave, funcionalidade: f.chave, permitido: !!cells[cellKey(p.chave, f.chave)] }),
        ),
      )
      const atualizada = await salvarMatriz(itens)
      aplicar(atualizada)
      alert.success('Permissões atualizadas com sucesso.')
    } catch {
      alert.error('Erro ao salvar as permissões.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Permissões por Perfil
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais telas cada perfil pode acessar. O Administrador tem acesso total.
          </p>
        </div>
        <Button onClick={handleSalvar} disabled={saving || loading}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de acesso</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : data ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-background">
                      Tela
                    </th>
                    {data.perfis.map(p => (
                      <th key={p.chave} className="px-3 py-2 font-medium text-center whitespace-nowrap">
                        {p.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.funcionalidades.map(f => (
                    <tr key={f.chave} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium sticky left-0 bg-background">{f.nome}</td>
                      {data.perfis.map(p => {
                        const isAdmin = p.chave === data.perfil_admin
                        const checked = isAdmin || !!cells[cellKey(p.chave, f.chave)]
                        return (
                          <td key={p.chave} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className={cn('h-4 w-4 accent-primary', isAdmin && 'opacity-50 cursor-not-allowed')}
                              checked={checked}
                              disabled={isAdmin}
                              onChange={() => toggle(p.chave, f.chave)}
                              aria-label={`${p.nome} acessa ${f.nome}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
