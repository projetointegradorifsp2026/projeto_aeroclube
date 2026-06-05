import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login, switchPerfilAtivo, type AuthUser } from "@/services/api/auth"
import { PROFILE_LABELS } from "@/mocks/users"

type FormErrors = {
  email?: string
  senha?: string
}

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})

  // Etapa 2: seleção de perfil (apenas quando o usuário tem múltiplos perfis)
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null)
  const [selectedPerfil, setSelectedPerfil] = useState("")
  const [switchingPerfil, setSwitchingPerfil] = useState(false)
  const [switchError, setSwitchError] = useState("")

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function handleSubmit() {
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
      try {
        const user = await login(email, senha)
        if (user.perfis.length > 1) {
          setSelectedPerfil(user.perfil_ativo)
          setPendingUser(user)
        } else {
          navigate("/dashboard")
        }
      } catch {
        setErrors({ email: "E-mail ou senha incorretos" })
      }
    }
  }

  async function handlePerfilConfirm() {
    if (!pendingUser || !selectedPerfil) return
    setSwitchingPerfil(true)
    setSwitchError("")
    try {
      await switchPerfilAtivo(pendingUser.id, selectedPerfil)
      navigate("/dashboard")
    } catch {
      setSwitchError("Erro ao selecionar perfil. Tente novamente.")
    } finally {
      setSwitchingPerfil(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#422974] to-[#7756B9] text-foreground px-4">
      <div className="w-full max-w-md rounded-4xl border border-border bg-card text-card-foreground shadow-2xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/logo_icon.svg" alt="Logo" className="w-[120px]" />
          <h1 className="text-3xl font-bold tracking-tight">Sistema Aeroclube</h1>
          {!pendingUser && (
            <p className="text-sm text-muted-foreground">
              Informe o seu login para acessar o sistema
            </p>
          )}
          {pendingUser && (
            <p className="text-sm text-muted-foreground">
              Escolha o perfil que deseja utilizar
            </p>
          )}
        </div>

        {/* Etapa 1: formulário de login */}
        {!pendingUser && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
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
              <label className="text-sm font-medium">Senha</label>
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
            <Button className="w-full h-10" onClick={handleSubmit}>
              Entrar
            </Button>
          </div>
        )}

        {/* Etapa 2: seleção de perfil */}
        {pendingUser && (
          <div className="space-y-4">
            <div className="grid gap-2">
              {pendingUser.perfis.map(p => (
                <label
                  key={p.perfil}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors select-none ${
                    selectedPerfil === p.perfil
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="perfil"
                    value={p.perfil}
                    checked={selectedPerfil === p.perfil}
                    onChange={() => setSelectedPerfil(p.perfil)}
                  />
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPerfil === p.perfil ? "border-primary" : "border-input"
                    }`}
                  >
                    {selectedPerfil === p.perfil && (
                      <span className="h-2 w-2 rounded-full bg-primary block" />
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    {PROFILE_LABELS[p.perfil as keyof typeof PROFILE_LABELS] ?? p.perfil}
                  </span>
                </label>
              ))}
            </div>

            {switchError && (
              <p className="text-sm text-destructive">{switchError}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingUser(null)}
                disabled={switchingPerfil}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handlePerfilConfirm}
                disabled={!selectedPerfil || switchingPerfil}
              >
                {switchingPerfil ? "Entrando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!pendingUser && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Esqueceu sua senha? Fale com o suporte
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
