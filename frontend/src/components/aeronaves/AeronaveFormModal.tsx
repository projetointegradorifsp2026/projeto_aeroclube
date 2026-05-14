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
import { type Aeronave } from '@/mocks/aeronaves'

export interface AeronaveFormData {
  nome: string
  valor_solo: number
  valor_duplo: number
  foto: string
  is_active: boolean
}

interface AeronaveFormModalProps {
  aeronave?: Aeronave | null
  open: boolean
  onClose: () => void
  onSave: (data: AeronaveFormData) => Promise<void>
  onDeleteRequest?: () => void
}

function makeEmpty(): AeronaveFormData {
  return {
    nome: '',
    valor_solo: 0,
    valor_duplo: 0,
    foto: '',
    is_active: true,
  }
}

type FormErrors = {
  nome?: string
  valor_solo?: string
  valor_duplo?: string
}

export function AeronaveFormModal({
  aeronave,
  open,
  onClose,
  onSave,
  onDeleteRequest,
}: AeronaveFormModalProps) {
  const [form, setForm] = useState<AeronaveFormData>(makeEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!aeronave

  useEffect(() => {
    if (open) {
      setForm(
        aeronave
          ? {
              nome: aeronave.nome,
              valor_solo: aeronave.valor_solo,
              valor_duplo: aeronave.valor_duplo,
              foto: aeronave.foto,
              is_active: aeronave.is_active,
            }
          : makeEmpty(),
      )
      setErrors({})
    }
  }, [aeronave, open])

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Prefixo é obrigatório'
    if (!form.valor_solo || form.valor_solo <= 0) e.valor_solo = 'Informe o valor solo'
    if (!form.valor_duplo || form.valor_duplo <= 0) e.valor_duplo = 'Informe o valor duplo'
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

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Aeronave' : 'Nova Aeronave'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados e tarifas da aeronave.'
              : 'Cadastre uma nova aeronave e suas tarifas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prefixo</label>
            <Input
              placeholder="PP-XYZ"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value.toUpperCase() }))}
              hasError={!!errors.nome}
              helper={errors.nome}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tarifa Solo (R$/h)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.valor_solo || ''}
                onChange={e => setForm(p => ({ ...p, valor_solo: parseFloat(e.target.value) || 0 }))}
                hasError={!!errors.valor_solo}
                helper={errors.valor_solo}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tarifa Duplo (R$/h)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.valor_duplo || ''}
                onChange={e => setForm(p => ({ ...p, valor_duplo: parseFloat(e.target.value) || 0 }))}
                hasError={!!errors.valor_duplo}
                helper={errors.valor_duplo}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Aeronave ativa</span>
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
