import { useEffect, useState } from 'react'
import { Landmark, Save, Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAlert } from '@/components/feedback/alert-provider'
import {
  getConfiguracoesBancarias,
  createConfiguracaoBancaria,
  updateConfiguracaoBancaria,
  type ConfiguracaoBancaria as Config,
} from '@/services/cnabService'

function defaults(): Config {
  return {
    descricao: 'Configuração Sicoob',
    codigo_banco: '756',
    nome_banco: 'SICOOB',
    nome_beneficiario: 'AERO CLUBE DE RIO CLARO',
    cpf_cnpj: '56.391.709/0001-10',
    prefixo_cooperativa: '1',
    dv_prefixo: '',
    codigo_beneficiario: '110980',
    dv_beneficiario: '4',
    conta_corrente: '23913',
    dv_conta: '5',
    carteira: '1',
    modalidade: '01',
    convenio: '',
    emissao: '2',
    tipo_formulario: '1',
    codigos_liquidacao: '06,17',
    chave_pix: '',
    nome_recebedor: '',
    cidade_recebedor: '',
    proximo_nsa: 1,
    proximo_nosso_numero: 1,
    is_active: true,
  }
}

const BENEF_KEYS: (keyof Config)[] = [
  'descricao', 'nome_beneficiario', 'cpf_cnpj', 'convenio',
  'codigo_banco', 'nome_banco', 'prefixo_cooperativa', 'dv_prefixo',
  'codigo_beneficiario', 'dv_beneficiario', 'conta_corrente', 'dv_conta',
  'carteira', 'modalidade', 'emissao', 'tipo_formulario',
  'proximo_nsa', 'proximo_nosso_numero', 'codigos_liquidacao',
]

const PIX_KEYS: (keyof Config)[] = ['chave_pix', 'nome_recebedor', 'cidade_recebedor']

const labelCls = 'text-sm font-medium'

export default function ConfiguracaoBancaria() {
  const alert = useAlert()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [editingBenef, setEditingBenef] = useState(false)
  const [editingPix, setEditingPix] = useState(false)
  const [snapshotBenef, setSnapshotBenef] = useState<Config | null>(null)
  const [snapshotPix, setSnapshotPix] = useState<Config | null>(null)

  useEffect(() => {
    getConfiguracoesBancarias()
      .then(list => setConfig(list[0] ?? defaults()))
      .catch(() => setConfig(defaults()))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave(keys: (keyof Config)[], onSuccess?: () => void) {
    if (!config) return
    setSaving(true)
    setSavedMsg('')
    try {
      const payload = Object.fromEntries(keys.map(k => [k, config[k]])) as Partial<Config>
      const saved = config.id
        ? await updateConfiguracaoBancaria(config.id, payload)
        : await createConfiguracaoBancaria(config)
      setConfig(prev => prev ? { ...prev, ...saved } : saved)
      setSavedMsg('Configuração salva com sucesso.')
      alert.success('Configuração bancária salva com sucesso')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setSavedMsg(`Erro ao salvar: ${msg}`)
      alert.error(err, 'Erro ao salvar configuração bancária.')
    } finally {
      setSaving(false)
    }
  }

  function startEditBenef() {
    setEditingBenef(true)
    setSnapshotBenef({ ...config! })
    setSavedMsg('')
  }

  function cancelEditBenef() {
    setEditingBenef(false)
    if (snapshotBenef) setConfig(snapshotBenef)
    setSnapshotBenef(null)
  }

  function startEditPix() {
    setEditingPix(true)
    setSnapshotPix({ ...config! })
    setSavedMsg('')
  }

  function cancelEditPix() {
    setEditingPix(false)
    if (snapshotPix) setConfig(snapshotPix)
    setSnapshotPix(null)
  }

  if (loading || !config) {
    return (
      <div className="pt-2 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card><CardContent className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    )
  }

  const changedBenef = editingBenef && snapshotBenef !== null &&
    BENEF_KEYS.some(k => config[k] !== snapshotBenef![k])

  const changedPix = editingPix && snapshotPix !== null &&
    PIX_KEYS.some(k => config[k] !== snapshotPix![k])

  const field = (label: string, key: keyof Config, disabled: boolean, placeholder = '', maxLength?: number) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <Input
        value={String(config[key] ?? '')}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={e => set(key, e.target.value as Config[typeof key])}
      />
    </div>
  )

  const editToggleBtn = (editing: boolean, onStart: () => void, onCancel: () => void) => (
    <button
      type="button"
      onClick={editing ? onCancel : onStart}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        editing
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
      title={editing ? 'Cancelar edição' : 'Editar'}
    >
      {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
    </button>
  )

  return (
    <div className="pt-2 space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração Bancária</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dados do beneficiário (cedente) usados na geração da remessa CNAB do Sicoob.
          </p>
        </div>
      </div>

      {/* ── Dados do Beneficiário ── */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dados do Beneficiário</CardTitle>
            {editToggleBtn(editingBenef, startEditBenef, cancelEditBenef)}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {field('Descrição', 'descricao', !editingBenef, '', 120)}
            {field('Nome / Razão Social', 'nome_beneficiario', !editingBenef, '', 120)}
            {field('CPF/CNPJ', 'cpf_cnpj', !editingBenef, '', 18)}
            {field('Convênio', 'convenio', !editingBenef, '', 20)}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Código do Banco', 'codigo_banco', !editingBenef, '', 3)}
            {field('Nome do Banco', 'nome_banco', !editingBenef, '', 30)}
            {field('Prefixo Cooperativa', 'prefixo_cooperativa', !editingBenef, '', 4)}
            {field('DV Prefixo', 'dv_prefixo', !editingBenef, '', 1)}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Código Beneficiário', 'codigo_beneficiario', !editingBenef, '', 10)}
            {field('DV Beneficiário', 'dv_beneficiario', !editingBenef, '', 1)}
            {field('Conta Corrente', 'conta_corrente', !editingBenef, '', 12)}
            {field('DV Conta', 'dv_conta', !editingBenef, '', 1)}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Carteira', 'carteira', !editingBenef, '', 2)}
            {field('Modalidade', 'modalidade', !editingBenef, '', 2)}
            <div className="space-y-1.5">
              <label className={labelCls}>Emissão do Boleto</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={config.emissao}
                disabled={!editingBenef}
                onChange={e => set('emissao', e.target.value)}
              >
                <option value="2">Beneficiário emite</option>
                <option value="1">Sicoob emite</option>
              </select>
            </div>
            {field('Tipo de Formulário', 'tipo_formulario', !editingBenef, '', 1)}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Próximo NSA (sequencial)</label>
              <Input
                type="number"
                min={1}
                value={config.proximo_nsa}
                disabled={!editingBenef}
                onChange={e => set('proximo_nsa', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Próximo Nosso Número</label>
              <Input
                type="number"
                min={1}
                value={config.proximo_nosso_numero}
                disabled={!editingBenef}
                onChange={e => set('proximo_nosso_numero', parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Códigos de liquidação (retorno)</label>
            <Input
              value={config.codigos_liquidacao ?? ''}
              placeholder="06,17"
              disabled={!editingBenef}
              maxLength={60}
              onChange={e => set('codigos_liquidacao', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Códigos de ocorrência do arquivo de retorno (.RET) que dão baixa automática no título,
              separados por vírgula. Padrão Sicoob: <strong>06</strong> = liquidação,{' '}
              <strong>17</strong> = liquidação após baixa.
            </p>
          </div>

          {changedBenef && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => handleSave(BENEF_KEYS, () => { setEditingBenef(false); setSnapshotBenef(null) })}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              {savedMsg && <span className="text-sm text-muted-foreground">{savedMsg}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recebimento via PIX ── */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebimento via PIX (QR Code)
            </CardTitle>
            {editToggleBtn(editingPix, startEditPix, cancelEditPix)}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Estes dados geram o QR Code / "copia e cola" no botão <strong>Pagar com PIX</strong> dos
            títulos a receber. Para a apresentação, use uma chave sua.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {field('Chave PIX', 'chave_pix', !editingPix, 'CPF/CNPJ, e-mail, telefone ou chave aleatória', 77)}
            {field('Nome do recebedor', 'nome_recebedor', !editingPix, 'máx. 25 caracteres', 25)}
            {field('Cidade do recebedor', 'cidade_recebedor', !editingPix, 'máx. 15 caracteres', 15)}
          </div>

          {changedPix && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => handleSave(PIX_KEYS, () => { setEditingPix(false); setSnapshotPix(null) })}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              {savedMsg && <span className="text-sm text-muted-foreground">{savedMsg}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
