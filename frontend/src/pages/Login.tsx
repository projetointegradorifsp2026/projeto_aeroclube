import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useState } from "react"
import { useNavigate } from "react-router-dom"

type FormErrors = {
  email?: string
  senha?: string
}


export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [errors, setErrors] = useState<FormErrors>({})

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = () => {
    const newErrors: FormErrors = {}

    if (!email) {
      newErrors.email = "E-mail é obrigatório"
    } else if (!isValidEmail(email)) {
      newErrors.email = "E-mail inválido"
    }

    if (!senha) {
      newErrors.senha = "Senha é obrigatória"
    } else if (senha.length <= 6) {
      newErrors.senha = "A senha deve ter mais de 6 caracteres"
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      console.log("form válido")

      navigate("/dashboard", {
        state: {
          user: email,
        },
      })
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#422974] to-[#7756B9] text-foreground px-4">

      {/* Container principal */}
      <div className="w-full max-w-md rounded-4xl border border-border bg-card text-card-foreground shadow-2xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/logo_icon.svg" alt="Logo" className="w-[120px]" />
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hasError={!!errors.email}
              helper={errors.email}
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
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              hasError={!!errors.senha}
              helper={errors.senha}
            />
          </div>

          <Button
            className="
            w-full
            h-10
            " onClick={handleSubmit}
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
