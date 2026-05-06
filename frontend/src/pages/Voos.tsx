import { Plane } from 'lucide-react'

export default function Voos() {
  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro e controle de todos os voos realizados
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
        <Plane className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-base font-medium">Em desenvolvimento</p>
        <p className="text-sm mt-1 opacity-70">O módulo de registro de voos estará disponível em breve.</p>
      </div>
    </div>
  )
}
