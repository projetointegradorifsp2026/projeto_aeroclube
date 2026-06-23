import { useEffect, useState } from 'react'
import { ShieldCheck, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlert } from '@/components/feedback/alert-provider'
import {
  getPermissoesUsuario,
  salvarPermissoesUsuario,
  type PermissaoUsuarioItem,
  type OverrideValor,
} from '@/services/permissoesService'

/** Card admin: exceções de acesso a telas para um usuário específico. */
export default function PermissoesUsuarioCard({ usuarioId }: { usuarioId: number }) {
  const alert = useAlert()
  const [itens, setItens] = useState<PermissaoUsuarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    getPermissoesUsuario(usuarioId)
      .then(res => setItens(res.itens))
      .catch(() => alert.error('Erro ao carregar as permissões do usuário.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [usuarioId])

  // valor do seletor: 'herdar' | 'liberar' | 'bloquear'
  function valorAtual(it: PermissaoUsuarioItem): 'herdar' | 'liberar' | 'bloquear' {
    if (it.override === null) return 'herdar'
    return it.override ? 'liberar' : 'bloquear'
  }

  function setValor(chave: string, valor: 'herdar' | 'liberar' | 'bloquear') {
    setItens(prev => prev.map(it => {
      if (it.funcionalidade !== chave) return it
      const override = valor === 'herdar' ? null : valor === 'liberar'
      const efetivo = override === null ? it.herdado_perfil : override
      return { ...it, override, efetivo }
    }))
  }

  async function handleSalvar() {
    setSaving(true)
    try {
      const payload = itens.map(it => {
        const v = valorAtual(it)
        const override: OverrideValor = v === 'herdar' ? 'herdar' : v === 'liberar'
        return { funcionalidade: it.funcionalidade, override }
      })
      const res = await salvarPermissoesUsuario(usuarioId, payload)
      setItens(res.itens)
      alert.success('Permissões do usuário atualizadas.')
    } catch {
      alert.error('Erro ao salvar as permissões do usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Acesso a telas (exceções)
        </CardTitle>
        <Button size="sm" onClick={handleSalvar} disabled={saving || loading}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Por padrão o usuário herda o acesso do perfil. Aqui você libera ou bloqueia telas
          específicas só para ele.
        </p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {itens.map(it => (
              <div key={it.funcionalidade} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{it.nome}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    (perfil: {it.herdado_perfil ? 'liberado' : 'bloqueado'})
                  </span>
                </div>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={valorAtual(it)}
                  onChange={e => setValor(it.funcionalidade, e.target.value as 'herdar' | 'liberar' | 'bloquear')}
                >
                  <option value="herdar">Herdar do perfil</option>
                  <option value="liberar">Liberar</option>
                  <option value="bloquear">Bloquear</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
