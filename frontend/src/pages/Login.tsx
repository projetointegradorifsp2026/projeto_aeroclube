import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import logo from "@/assets/logo_aeroclube.svg"



export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#422974] to-[#7756B9] text-foreground px-4">

      {/* Container principal */}
      <div className="w-full max-w-md rounded-4xl border border-border bg-card text-card-foreground shadow-2xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src={logo} alt="Logo" className="w-[250px]"/>
          <h1 className="text-3xl font-bold tracking-tight ">
            Sistema Aeroclube
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe o seu login para acessar o sistema
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">

          <div className="space-y-2">
            <label className="text-sm font-medium">
              E-mail
            </label>
            <Input
              placeholder="seuemail@exemplo.com"
              className="bg-background h-10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Senha
            </label>
            <Input
            
              type="password"
              placeholder="••••••••"
              className="bg-background h-10"
            />
          </div>

          <Button
            className="
            w-full
            h-10
            " onClick={() => {
              alert("Teste")
            }}
          >
            Entrar
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Esqueceu sua senha? Fale com o suporte
          </p>
        </div>

      </div>
    </div>
  )
}