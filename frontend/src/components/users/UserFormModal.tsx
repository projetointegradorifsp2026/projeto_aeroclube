import { useState, useEffect, useRef, type FormEvent } from 'react'
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
import { ALL_PROFILES, PROFILE_LABELS, type User, type UserProfile } from '@/mocks/users'
import { cn } from '@/lib/utils'
import { maskCEP } from '@/lib/masks'
import { buscarEnderecoPorCEP } from '@/services/cepService'

export interface UserFormData {
  nome: string
  email: string
  cpf: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  perfis: UserProfile[]
  is_active: boolean
}

interface UserFormModalProps {
  user?: User | null
  open: boolean
  onClose: () => void
  onSave: (data: UserFormData) => Promise<void>
  /** Quando true, exibe apenas nome, e-mail e CPF (uso do próprio usuário não-admin) */
  restrictedFields?: boolean
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

const emptyForm: UserFormData = {
  nome: '',
  email: '',
  cpf: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  perfis: [],
  is_active: true,
}

type FormErrors = Partial<Record<keyof UserFormData, string>>

export function UserFormModal({ user, open, onClose, onSave, restrictedFields = false }: UserFormModalProps) {
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const cepAbortRef = useRef<AbortController | null>(null)
  const isEdit = !!user

  useEffect(() => {
    if (open) {
      setSaveError(null)
      setForm(
        user
          ? {
              nome: user.nome,
              email: user.email,
              cpf: user.cpf,
              cep: user.cep ?? '',
              logradouro: user.logradouro ?? '',
              numero: user.numero ?? '',
              bairro: user.bairro ?? '',
              cidade: user.cidade ?? '',
              uf: user.uf ?? '',
              perfis: user.perfis,
              is_active: user.is_active,
            }
          : emptyForm,
      )
      setErrors({})
    }
  }, [user, open])

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.email.trim()) {
      e.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'E-mail inválido'
    }
    const cpfDigits = form.cpf.replace(/\D/g, '')
    if (!cpfDigits) e.cpf = 'CPF é obrigatório'
    else if (cpfDigits.length !== 11) e.cpf = 'CPF inválido'
    if (!restrictedFields) {
      if (!form.logradouro.trim()) e.logradouro = 'Logradouro é obrigatório'
      if (!form.numero.trim()) e.numero = 'Número é obrigatório'
      const cepDigits = form.cep.replace(/\D/g, '')
      if (!cepDigits) e.cep = 'CEP é obrigatório'
      else if (cepDigits.length !== 8) e.cep = 'CEP inválido'
      if (!form.bairro.trim()) e.bairro = 'Bairro é obrigatório'
      if (!form.uf.trim()) e.uf = 'UF é obrigatória'
      if (!form.cidade.trim()) e.cidade = 'Cidade é obrigatória'
      if (form.perfis.length === 0) e.perfis = 'Selecione ao menos um perfil'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      let msg = raw
      try {
        const parsed = JSON.parse(raw)
        const first = Object.values(parsed)[0]
        msg = Array.isArray(first) ? first[0] : String(first)
      } catch { /* use raw message */ }
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleCepChange(raw: string) {
    const masked = maskCEP(raw)
    setForm(p => ({ ...p, cep: masked }))
    setCepError(null)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return
    cepAbortRef.current?.abort()
    cepAbortRef.current = new AbortController()
    setCepLoading(true)
    const endereco = await buscarEnderecoPorCEP(digits)
    setCepLoading(false)
    if (!endereco) {
      setCepError('CEP não encontrado')
      return
    }
    setForm(p => ({
      ...p,
      logradouro: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      uf: endereco.uf,
    }))
    setErrors(prev => ({ ...prev, logradouro: undefined, bairro: undefined, cidade: undefined, uf: undefined, cep: undefined }))
  }

  function togglePerfil(p: UserProfile) {
    setForm(prev => {
      const has = prev.perfis.includes(p)
      const next = has ? prev.perfis.filter(x => x !== p) : [...prev.perfis, p]
      return { ...prev, perfis: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do usuário.'
              : 'Preencha os dados para cadastrar um novo usuário. A senha inicial será gerada automaticamente: aero + 5 primeiros dígitos do CPF.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1" autoComplete="off">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              placeholder="Nome do usuário"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              hasError={!!errors.nome}
              helper={errors.nome}
              autoComplete="off"
            />
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
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">CPF</label>
            <Input
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))}
              hasError={!!errors.cpf}
              helper={errors.cpf}
              autoComplete="off"
            />
          </div>

          <div className="pt-1">
            <p className="text-xs text-muted-foreground">Endereço</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">CEP</label>
              <Input
                placeholder="00000-000"
                value={form.cep}
                onChange={e => handleCepChange(e.target.value)}
                hasError={!!errors.cep || !!cepError}
                helper={cepError ?? errors.cep}
                disabled={cepLoading}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Número</label>
              <Input placeholder="123" value={form.numero}
                onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                hasError={!!errors.numero} helper={errors.numero} autoComplete="off" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Logradouro</label>
            <Input placeholder={cepLoading ? 'Buscando...' : 'Rua / Avenida'} value={form.logradouro}
              onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))}
              hasError={!!errors.logradouro} helper={errors.logradouro}
              disabled={cepLoading} autoComplete="off" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Bairro</label>
              <Input placeholder="Bairro" value={form.bairro}
                onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                hasError={!!errors.bairro} helper={errors.bairro}
                disabled={cepLoading} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UF</label>
              <Input placeholder="SP" maxLength={2} value={form.uf}
                onChange={e => setForm(p => ({ ...p, uf: e.target.value.toUpperCase() }))}
                hasError={!!errors.uf} helper={errors.uf}
                disabled={cepLoading} autoComplete="off" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cidade</label>
            <Input placeholder="Cidade" value={form.cidade}
              onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
              hasError={!!errors.cidade} helper={errors.cidade}
              disabled={cepLoading} autoComplete="off" />
          </div>

          {!restrictedFields && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Perfis</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PROFILES.map(p => (
                  <label
                    key={p}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors select-none',
                      form.perfis.includes(p)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.perfis.includes(p)}
                      onChange={() => togglePerfil(p)}
                    />
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0',
                        form.perfis.includes(p) ? 'border-primary bg-primary' : 'border-input',
                      )}
                    >
                      {form.perfis.includes(p) && (
                        <svg viewBox="0 0 10 8" className="h-2 w-2 fill-white">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    {PROFILE_LABELS[p]}
                  </label>
                ))}
              </div>
              {errors.perfis && <p className="text-xs text-destructive">{errors.perfis}</p>}
            </div>
          )}

          {/* Ativo: apenas na edição e apenas para admin */}
          {isEdit && !restrictedFields && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Usuário ativo</span>
            </label>
          )}

          {saveError && (
            <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {saveError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
