import { useState, useEffect, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  type Entidade,
  type EntidadeTipo,
  ENTIDADE_TIPO_LABELS,
  ALL_ENTIDADE_TIPOS,
} from '@/mocks/entidades'

export interface EntidadeFormData {
  nome: string
  cpf_cnpj: string
  email: string
  contato: string
  tipo: EntidadeTipo
  is_active: boolean
}

interface EntidadeFormModalProps {
  entidade?: Entidade | null
  open: boolean
  onClose: () => void
  onSave: (data: EntidadeFormData) => Promise<void>
  onDeleteRequest?: () => void
  tipoFixo?: EntidadeTipo
  tiposPermitidos?: EntidadeTipo[]
  titulo?: string
}

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

function makeEmpty(tipoFixo?: EntidadeTipo): EntidadeFormData {
  return {
    nome: '',
    cpf_cnpj: '',
    email: '',
    contato: '',
    tipo: tipoFixo ?? 'fornecedor',
    is_active: true,
  }
}

type FormErrors = {
  nome?: string
  cpf_cnpj?: string
  email?: string
}

export function EntidadeFormModal({
  entidade,
  open,
  onClose,
  onSave,
  onDeleteRequest,
  tipoFixo,
  tiposPermitidos,
  titulo,
}: EntidadeFormModalProps) {
  const [form, setForm] = useState<EntidadeFormData>(makeEmpty(tipoFixo))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!entidade

  const tipos = tipoFixo
    ? [tipoFixo]
    : (tiposPermitidos ?? ALL_ENTIDADE_TIPOS)

  useEffect(() => {
    if (open) {
      setForm(
        entidade
          ? {
              nome: entidade.nome,
              cpf_cnpj: entidade.cpf_cnpj,
              email: entidade.email,
              contato: entidade.contato,
              tipo: entidade.tipo,
              is_active: entidade.is_active,
            }
          : makeEmpty(tipoFixo),
      )
      setErrors({})
    }
  }, [entidade, open, tipoFixo])

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.cpf_cnpj.trim()) e.cpf_cnpj = 'CPF/CNPJ é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const modalTitle = titulo ?? (isEdit ? 'Editar Cadastro' : 'Novo Cadastro')

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do cadastro.' : 'Preencha os dados para novo cadastro.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Nome completo ou razão social"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                hasError={!!errors.nome}
                helper={errors.nome}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              {tipos.length === 1 ? (
                <div className="h-10 rounded-lg border border-input bg-muted/40 px-2.5 text-sm flex items-center text-muted-foreground">
                  {ENTIDADE_TIPO_LABELS[tipos[0]]}
                </div>
              ) : (
                <select
                  className={selectCls}
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value as EntidadeTipo }))}
                >
                  {tipos.map(t => (
                    <option key={t} value={t}>
                      {ENTIDADE_TIPO_LABELS[t]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CPF / CNPJ</label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf_cnpj}
                onChange={e => setForm(p => ({ ...p, cpf_cnpj: e.target.value }))}
                hasError={!!errors.cpf_cnpj}
                helper={errors.cpf_cnpj}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contato</label>
              <Input
                placeholder="(11) 99999-9999"
                value={form.contato}
                onChange={e => setForm(p => ({ ...p, contato: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">E-mail</label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              hasError={!!errors.email}
              helper={errors.email}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Ativo</span>
          </label>

          <DialogFooter>
            <div className="flex w-full items-center gap-2">
              {isEdit && onDeleteRequest && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={onDeleteRequest}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
