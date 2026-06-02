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
import { type Aeronave, type TipoAeronave } from '@/mocks/aeronaves'
import { cn } from '@/lib/utils'

export interface AeronaveFormData {
  nome: string
  tipo: TipoAeronave
  foto: string
  is_active: boolean
  valor_solo: number
  valor_duplo: number
  valor_fixo_inicial: number
  tempo_limite: number
  valor_por_minuto: number
}

interface AeronaveFormModalProps {
  aeronave?: Aeronave | null
  open: boolean
  onClose: () => void
  onSave: (data: AeronaveFormData) => Promise<void>
  onDeleteRequest?: () => void
}

type FormErrors = {
  nome?: string
  valor_solo?: string
  valor_duplo?: string
  valor_fixo_inicial?: string
  tempo_limite?: string
  valor_por_minuto?: string
}

function makeEmpty(): AeronaveFormData {
  return {
    nome: '',
    tipo: 'aviao',
    foto: '',
    is_active: true,
    valor_solo: 0,
    valor_duplo: 0,
    valor_fixo_inicial: 0,
    tempo_limite: 30,
    valor_por_minuto: 0,
  }
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
              tipo: aeronave.tipo,
              foto: aeronave.foto,
              is_active: aeronave.is_active,
              valor_solo: aeronave.valor_solo,
              valor_duplo: aeronave.valor_duplo,
              valor_fixo_inicial: aeronave.valor_fixo_inicial,
              tempo_limite: aeronave.tempo_limite,
              valor_por_minuto: aeronave.valor_por_minuto,
            }
          : makeEmpty(),
      )
      setErrors({})
    }
  }, [aeronave, open])

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Prefixo é obrigatório'
    if (form.tipo === 'aviao') {
      if (!form.valor_solo || form.valor_solo <= 0) e.valor_solo = 'Informe a tarifa solo'
      if (!form.valor_duplo || form.valor_duplo <= 0) e.valor_duplo = 'Informe a tarifa duplo'
    } else {
      if (!form.valor_fixo_inicial || form.valor_fixo_inicial <= 0)
        e.valor_fixo_inicial = 'Informe o valor fixo inicial'
      if (!form.tempo_limite || form.tempo_limite <= 0)
        e.tempo_limite = 'Informe o tempo limite em minutos'
      if (!form.valor_por_minuto || form.valor_por_minuto <= 0)
        e.valor_por_minuto = 'Informe o valor por minuto adicional'
    }
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
          {/* Tipo selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo de aeronave</label>
            <div className="flex rounded-lg border border-input overflow-hidden w-fit">
              {(['aviao', 'planador'] as const).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, tipo }))}
                  className={cn(
                    'px-5 py-2 text-sm font-medium transition-colors',
                    form.tipo === tipo
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {tipo === 'aviao' ? 'Avião' : 'Planador'}
                </button>
              ))}
            </div>
          </div>

          {/* Prefixo */}
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

          {/* Avião: tarifas horárias */}
          {form.tipo === 'aviao' && (
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
          )}

          {/* Planador: modelo híbrido */}
          {form.tipo === 'planador' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor fixo inicial (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  value={form.valor_fixo_inicial || ''}
                  onChange={e =>
                    setForm(p => ({ ...p, valor_fixo_inicial: parseFloat(e.target.value) || 0 }))
                  }
                  hasError={!!errors.valor_fixo_inicial}
                  helper={errors.valor_fixo_inicial}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tempo limite (min)</label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="30"
                    value={form.tempo_limite || ''}
                    onChange={e =>
                      setForm(p => ({ ...p, tempo_limite: parseInt(e.target.value) || 0 }))
                    }
                    hasError={!!errors.tempo_limite}
                    helper={errors.tempo_limite}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Adicional (R$/min)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    value={form.valor_por_minuto || ''}
                    onChange={e =>
                      setForm(p => ({ ...p, valor_por_minuto: parseFloat(e.target.value) || 0 }))
                    }
                    hasError={!!errors.valor_por_minuto}
                    helper={errors.valor_por_minuto}
                  />
                </div>
              </div>
            </div>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Aeronave ativa</span>
            </label>
          )}

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
