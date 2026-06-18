import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login, switchPerfilAtivo, type AuthUser } from "@/services/api/auth"
import { solicitarResetSenha } from "@/services/passwordService"
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

  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null)
  const [selectedPerfil, setSelectedPerfil] = useState("")
  const [switchingPerfil, setSwitchingPerfil] = useState(false)
  const [switchError, setSwitchError] = useState("")

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleForgot() {
    if (!isValidEmail(forgotEmail)) return
    setForgotLoading(true)
    try {
      await solicitarResetSenha(forgotEmail)
      setForgotSent(true)
    } catch {
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Painel esquerdo — hero cinematográfico ── */}
      <div
        className="relative lg:w-[58%] min-h-[340px] lg:min-h-screen flex flex-col justify-between overflow-hidden"
        style={{ backgroundColor: "#08070f" }}
      >
        {/* Foto de fundo do aeroclube — substitua pelo caminho local quando disponível */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://www.aeroclubederioclaro.com.br/photos_galeria/avioes.jpg')",
          }}
          aria-hidden="true"
        />

        {/* Overlay escuro gradiente — garante legibilidade mesmo sem foto */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(8,7,15,0.97) 0%, rgba(42,20,80,0.92) 60%, rgba(8,7,15,0.97) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Conteúdo sobre o overlay */}
        <div className="relative z-10 flex flex-col h-full p-8 lg:p-14 justify-between gap-10">


          {/* Centro: headline + sub + stats */}
          <div className="space-y-6 h-full flex flex-col justify-center">

            {/* Badge com pulso — estilo .urgency da LP */}
            <span className="inline-flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-violet-300">
                Aeroclube de Rio Claro
              </span>
            </span>

            {/* Headline principal — estilo h1 da LP com palavra em destaque */}
            <h1 className="text-4xl lg:text-[3.5rem] font-black text-white leading-[1.05] tracking-tight">
              Onde sonhos<br />
              ganham{" "}
              <em className="not-italic" style={{ color: "#a78bfa" }}>asas.</em>
            </h1>

            {/* Sub — estilo .sub da LP */}
            <p className="text-sm lg:text-base text-gray-400 max-w-sm leading-relaxed">
              Escola de pilotagem civil homologada pela ANAC. Formando
              aviadores e servindo à região de Rio Claro desde 1939.
            </p>

            {/* Stats — estilo .stats da LP */}
            <div className="flex gap-8 lg:gap-12 pt-1">
              {[
                { num: "1939", lbl: "Fundado" },
                { num: "Rio Claro", lbl: "local" },
                { num: "SDRK", lbl: "ICAO" },
                { num: "ANAC", lbl: "Homologado" },
              ].map((s) => (
                <div key={s.num}>
                  <div className="text-2xl lg:text-3xl font-black text-white">{s.num}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="lg:w-[42%] flex items-center justify-center bg-background px-6 py-10 lg:p-14">
        <div className="w-full max-w-sm space-y-6">
          {/* Topo: logo */}
          <div className="flex justify-center">
            <img src="/logo_icon.svg" alt="Logo Aeroclube" className="w-30" />
          </div>
          {/* Header do formulário */}
          <div className="text-center space-y-1">


            <h2 className="text-2xl font-bold tracking-tight">
              {pendingUser
                ? "Selecione o perfil"
                : forgotMode
                  ? "Recuperar senha"
                  : "Acessar o sistema"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {pendingUser
                ? "Escolha o perfil que deseja utilizar"
                : forgotMode
                  ? "Informe seu e-mail para redefinir a senha"
                  : "Informe suas credenciais para entrar"}
            </p>
          </div>

          {/* Esqueci minha senha */}
          {!pendingUser && forgotMode && (
            <div className="space-y-4">
              {forgotSent ? (
                <p className="text-sm text-center text-muted-foreground">
                  Se o e-mail estiver cadastrado, enviamos as instruções de
                  redefinição. Verifique sua caixa de entrada.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input
                      placeholder="seuemail@exemplo.com"
                      className="bg-background h-10"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full h-10"
                    onClick={handleForgot}
                    disabled={forgotLoading || !isValidEmail(forgotEmail)}
                  >
                    {forgotLoading ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => {
                  setForgotMode(false)
                  setForgotSent(false)
                  setForgotEmail("")
                }}
              >
                Voltar ao login
              </Button>
            </div>
          )}

          {/* Formulário de login */}
          {!pendingUser && !forgotMode && (
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

          {/* Seleção de perfil */}
          {pendingUser && (
            <div className="space-y-4">
              <div className="grid gap-2">
                {pendingUser.perfis.map((p) => (
                  <label
                    key={p.perfil}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors select-none ${selectedPerfil === p.perfil
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
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPerfil === p.perfil ? "border-primary" : "border-input"
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
          {!pendingUser && !forgotMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                Esqueci minha senha
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
