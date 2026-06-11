import { useEffect, useState } from 'react'
import { Landmark, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getConfiguracoesBancarias,
  createConfiguracaoBancaria,
  updateConfiguracaoBancaria,
  type ConfiguracaoBancaria as Config,
} from '@/services/cnabService'

// Valores padrão Sicoob — Aero Clube de Rio Claro (planilha do banco)
// Obs.: o "Prefixo da Cooperativa" deve ser o número da cooperativa REAL da conta
// (o validador exige que a agência seja igual a ela). O "1001-4" da planilha era o
// template da SICOOB CENTRAL ES, não a cooperativa do aeroclube — confirmar com o banco.
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
    proximo_nsa: 1,
    proximo_nosso_numero: 1,
    is_active: true,
  }
}

const labelCls = 'text-sm font-medium'

export default function ConfiguracaoBancaria() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    getConfiguracoesBancarias()
      .then(list => setConfig(list[0] ?? defaults()))
      .catch(() => setConfig(defaults()))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setSavedMsg('')
    try {
      const saved = config.id
        ? await updateConfiguracaoBancaria(config.id, config)
        : await createConfiguracaoBancaria(config)
      setConfig(saved)
      setSavedMsg('Configuração salva com sucesso.')
    } catch (e) {
      setSavedMsg('Erro ao salvar a configuração.')
    } finally {
      setSaving(false)
    }
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

  const field = (label: string, key: keyof Config, placeholder = '') => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <Input
        value={String(config[key] ?? '')}
        placeholder={placeholder}
        onChange={e => set(key, e.target.value as Config[typeof key])}
      />
    </div>
  )

  return (
    <div className="pt-2 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Landmark className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração Bancária</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dados do beneficiário (cedente) usados na geração da remessa CNAB do Sicoob.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Dados do Beneficiário</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {field('Descrição', 'descricao')}
            {field('Nome / Razão Social', 'nome_beneficiario')}
            {field('CPF/CNPJ', 'cpf_cnpj')}
            {field('Convênio', 'convenio')}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Código do Banco', 'codigo_banco')}
            {field('Nome do Banco', 'nome_banco')}
            {field('Prefixo Cooperativa', 'prefixo_cooperativa')}
            {field('DV Prefixo', 'dv_prefixo')}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Código Beneficiário', 'codigo_beneficiario')}
            {field('DV Beneficiário', 'dv_beneficiario')}
            {field('Conta Corrente', 'conta_corrente')}
            {field('DV Conta', 'dv_conta')}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {field('Carteira', 'carteira')}
            {field('Modalidade', 'modalidade')}
            <div className="space-y-1.5">
              <label className={labelCls}>Emissão do Boleto</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={config.emissao}
                onChange={e => set('emissao', e.target.value)}
              >
                <option value="2">Beneficiário emite</option>
                <option value="1">Sicoob emite</option>
              </select>
            </div>
            {field('Tipo de Formulário', 'tipo_formulario')}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Próximo NSA (sequencial)</label>
              <Input
                type="number"
                min={1}
                value={config.proximo_nsa}
                onChange={e => set('proximo_nsa', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Próximo Nosso Número</label>
              <Input
                type="number"
                min={1}
                value={config.proximo_nosso_numero}
                onChange={e => set('proximo_nosso_numero', parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </Button>
            {savedMsg && <span className="text-sm text-muted-foreground">{savedMsg}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
