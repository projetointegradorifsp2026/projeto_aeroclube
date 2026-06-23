import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, QrCode } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { gerarPixCopiaECola } from '@/lib/pix'
import { getConfiguracoesBancarias, type ConfiguracaoBancaria } from '@/services/cnabService'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props {
  open: boolean
  onClose: () => void
  valor: number
  descricao?: string
  referencia?: string
}

export function PixPagamentoDialog({ open, onClose, valor, descricao, referencia }: Props) {
  const [config, setConfig] = useState<ConfiguracaoBancaria | null>(null)
  const [loading, setLoading] = useState(false)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getConfiguracoesBancarias()
      .then(list => {
        const cfg =
          list.find(c => c.is_active && c.chave_pix) ?? list.find(c => c.chave_pix) ?? null
        setConfig(cfg)
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false))
  }, [open])

  const payload = config?.chave_pix
    ? gerarPixCopiaECola({
        chave: config.chave_pix,
        nome: config.nome_recebedor || config.nome_beneficiario || 'AEROCLUBE',
        cidade: config.cidade_recebedor || 'CIDADE',
        valor,
        txid: referencia,
      })
    : ''

  useEffect(() => {
    if (!payload) {
      setQr('')
      return
    }
    QRCode.toDataURL(payload, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [payload])

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard pode estar indisponível em contexto não-seguro */
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Pagar com PIX
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !config?.chave_pix ? (
          <div className="space-y-1 py-6 text-center text-sm text-muted-foreground">
            <p>Nenhuma chave PIX configurada.</p>
            <p className="text-xs">
              Cadastre a chave em <strong>Configuração Bancária</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-xl font-bold">{fmt(valor)}</p>
              {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
            </div>

            {qr && (
              <div className="flex justify-center">
                <img
                  src={qr}
                  alt="QR Code PIX"
                  width={240}
                  height={240}
                  className="rounded-lg border border-border"
                />
              </div>
            )}

            <div>
              <p className="mb-1 text-xs text-muted-foreground">PIX copia e cola</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <code className="max-h-20 flex-1 overflow-y-auto break-all rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px]">
                  {payload}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar">
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Beneficiário: {config.nome_recebedor || config.nome_beneficiario || '—'}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
