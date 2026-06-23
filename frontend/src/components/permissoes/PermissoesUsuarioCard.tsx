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
} from '@/services/permissoesService'

/**
 * Card admin: telas administrativas liberadas para um usuário com perfil admin.
 * Só deve ser renderizado quando o usuário visualizado é administrador.
 */
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

  function toggle(chave: string) {
    setItens(prev => prev.map(it =>
      it.funcionalidade === chave ? { ...it, permitido: !it.permitido } : it
    ))
  }

  async function handleSalvar() {
    setSaving(true)
    try {
      const payload = itens.map(it => ({
        funcionalidade: it.funcionalidade,
        permitido: it.permitido,
      }))
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
          Telas liberadas
        </CardTitle>
        <Button size="sm" onClick={handleSalvar} disabled={saving || loading}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Marque as telas administrativas que este usuário pode acessar. As telas comuns
          (dashboard e movimentações) ficam sempre disponíveis.
        </p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {itens.map(it => (
              <label
                key={it.funcionalidade}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={it.permitido}
                  onChange={() => toggle(it.funcionalidade)}
                />
                <span className="text-sm font-medium">{it.nome}</span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
