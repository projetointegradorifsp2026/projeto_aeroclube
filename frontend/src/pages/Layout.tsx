import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
    useSidebar
} from "@/components/ui/sidebar"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

import { TooltipProvider } from "@/components/ui/tooltip"

import {
    ChevronsUpDown, LogOut, User, Users, ChevronDown, ChartSpline, FileInput, FileOutput,
    Plane, ChartNoAxesColumnIncreasing, FolderPlus, FileUser, Truck, DollarSign,
    RefreshCw
} from "lucide-react"

import { Link, useLocation, useNavigate } from "react-router-dom"
import { Outlet } from "react-router-dom"
import logoIcon from "/logo_icon.svg"
import { useEffect, useState } from "react"
import { getCurrentUser, logout as authLogout, switchPerfilAtivo, isAuthenticated, type AuthUser } from "@/services/api/auth"
import { canAccess } from "@/lib/permissions"
import { PROFILE_LABELS } from "@/mocks/users"

interface SidebarConsumerProps {
    openCadastros: boolean
    setOpenCadastros: React.Dispatch<React.SetStateAction<boolean>>
    pathname: string
    currentUser: AuthUser | null
    onLogout: () => void
    onUserUpdated: (user: AuthUser) => void
}

function SidebarConsumer({ openCadastros, setOpenCadastros, pathname, currentUser, onLogout, onUserUpdated }: SidebarConsumerProps) {
    const { state, isMobile, setOpen } = useSidebar()
    const navigate = useNavigate()
    const isCollapsed = state === "collapsed"
    const userName = currentUser?.nome ?? "Usuário"
    const userEmail = currentUser?.email ?? ""
    const userInitial = userName[0]?.toUpperCase() ?? "U"
    const perfil = currentUser?.perfil_ativo ?? ""
    const temMultiplosPerfis = (currentUser?.perfis?.length ?? 0) > 1

    const [switchDialogOpen, setSwitchDialogOpen] = useState(false)
    const [selectedPerfil, setSelectedPerfil] = useState(perfil)
    const [switching, setSwitching] = useState(false)
    const [switchError, setSwitchError] = useState("")

    async function handleSwitchPerfil() {
        if (!currentUser || !selectedPerfil || selectedPerfil === currentUser.perfil_ativo) {
            setSwitchDialogOpen(false)
            return
        }
        setSwitching(true)
        setSwitchError("")
        try {
            const updated = await switchPerfilAtivo(currentUser.id, selectedPerfil)
            onUserUpdated(updated)
            setSwitchDialogOpen(false)
            navigate("/dashboard")
        } catch {
            setSwitchError("Erro ao trocar perfil. Tente novamente.")
        } finally {
            setSwitching(false)
        }
    }

    function openSwitchDialog() {
        setSelectedPerfil(currentUser?.perfil_ativo ?? "")
        setSwitchError("")
        setSwitchDialogOpen(true)
    }

    const titulosReceberLabel = ['aluno', 'socio', 'externo'].includes(perfil)
        ? 'Minhas Faturas'
        : 'Títulos a receber'

    const titulosPagarLabel = ['instrutor', 'funcionario'].includes(perfil)
        ? 'Meus Pagamentos'
        : 'Títulos a pagar'

    return (
        <>
            <Sidebar collapsible="icon" className="border-r-0">
                {/* HEADER */}
                <SidebarHeader className="flex flex-col pt-3 gap-1">
                    <div className="flex justify-end group-data-[collapsible=icon]:justify-center px-1">
                        <SidebarTrigger />
                    </div>
                    <div className="flex items-center justify-center h-[70px] pb-2">
                        <img
                            src={logoIcon}
                            alt="Logo aeroclube"
                            className="h-full object-contain"
                        />
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    {/* GRUPO GERAL */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Geral</SidebarGroupLabel>

                        <SidebarMenu>
                            {canAccess(perfil, '/dashboard') && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/dashboard"}
                                        tooltip="Dashboard"
                                    >
                                        <Link to="/dashboard">
                                            <ChartNoAxesColumnIncreasing />
                                            <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}

                            {canAccess(perfil, '/usuarios') && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/usuarios"}
                                        tooltip="Usuários"
                                    >
                                        <Link to="/usuarios">
                                            <Users />
                                            <span className="group-data-[collapsible=icon]:hidden">Usuários</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}

                            {canAccess(perfil, '/movimentacoes') && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/movimentacoes"}
                                        tooltip="Movimentações"
                                    >
                                        <Link to="/movimentacoes">
                                            <ChartSpline />
                                            <span className="group-data-[collapsible=icon]:hidden">Movimentações</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}

                            {canAccess(perfil, '/voos') && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/voos"}
                                        tooltip="Voos"
                                    >
                                        <Link to="/voos">
                                            <Plane />
                                            <span className="group-data-[collapsible=icon]:hidden">Voos</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
                    </SidebarGroup>

                    {/* GRUPO TÍTULOS */}
                    {(canAccess(perfil, '/titulos-a-receber') || canAccess(perfil, '/titulos-a-pagar')) && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Títulos</SidebarGroupLabel>

                            <SidebarMenu>
                                {canAccess(perfil, '/titulos-a-receber') && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith("/titulos-a-receber")}
                                            tooltip={titulosReceberLabel}
                                        >
                                            <Link to="/titulos-a-receber">
                                                <FileInput />
                                                <span className="group-data-[collapsible=icon]:hidden">{titulosReceberLabel}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                                {canAccess(perfil, '/titulos-a-pagar') && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith("/titulos-a-pagar")}
                                            tooltip={titulosPagarLabel}
                                        >
                                            <Link to="/titulos-a-pagar">
                                                <FileOutput />
                                                <span className="group-data-[collapsible=icon]:hidden">{titulosPagarLabel}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    )}

                    {/* GRUPO CADASTROS (admin) */}
                    {canAccess(perfil, '/aeronaves') && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Cadastros</SidebarGroupLabel>

                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => {
                                            if (isCollapsed) {
                                                setOpen(true)
                                                setOpenCadastros(true)
                                                return
                                            }
                                            setOpenCadastros(prev => !prev)
                                        }}
                                        tooltip="Cadastrar"
                                    >
                                        <FolderPlus className="shrink-0" />
                                        <span className="group-data-[collapsible=icon]:hidden truncate">Cadastrar</span>
                                        <ChevronDown
                                            className={`ml-auto h-4 w-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden ${openCadastros ? "rotate-180" : ""}`}
                                        />
                                    </SidebarMenuButton>

                                    {openCadastros && (
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={pathname.startsWith("/aeronaves")}
                                                >
                                                    <Link to="/aeronaves">
                                                        <Plane />
                                                        <span>Aeronaves</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>

                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={pathname.startsWith("/clientes")}
                                                >
                                                    <Link to="/clientes">
                                                        <FileUser />
                                                        <span>Clientes</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>

                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={pathname.startsWith("/fornecedores")}
                                                >
                                                    <Link to="/fornecedores">
                                                        <Truck />
                                                        <span>Fornecedores</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>

                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={pathname.startsWith("/conta-fixa")}
                                                >
                                                    <Link to="/conta-fixa">
                                                        <DollarSign />
                                                        <span>Conta fixa</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </SidebarMenuSub>
                                    )}
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                {/* FOOTER */}
                <SidebarFooter>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center justify-between gap-2 rounded-md p-2 hover:bg-sidebar-accent overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src="" />
                                        <AvatarFallback>{userInitial}</AvatarFallback>
                                    </Avatar>

                                    {(!isCollapsed || isMobile) && (
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-medium truncate text-start">
                                                {userName}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate text-start">
                                                {userEmail}
                                            </span>
                                            {perfil && (
                                                <span className="inline-flex w-fit mt-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary leading-tight">
                                                    {PROFILE_LABELS[perfil as keyof typeof PROFILE_LABELS] ?? perfil}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                                )}
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                                onClick={() => currentUser && navigate(`/usuarios/${currentUser.id}`)}
                                disabled={!currentUser}
                            >
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </DropdownMenuItem>

                            {temMultiplosPerfis && (
                                <DropdownMenuItem onClick={openSwitchDialog}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Trocar Perfil Ativo
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={onLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarFooter>
            </Sidebar>

            {/* CONTEÚDO */}
            <SidebarInset className="mt-3 rounded-tl-[2.5rem] rounded-bl-[2.5rem] overflow-hidden">
                <div className="p-8">
                    <Outlet />
                </div>
            </SidebarInset>

            {/* DIALOG: Trocar Perfil Ativo */}
            <Dialog open={switchDialogOpen} onOpenChange={o => !o && setSwitchDialogOpen(false)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Trocar Perfil Ativo</DialogTitle>
                        <DialogDescription>
                            Selecione o perfil que deseja utilizar agora.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2 py-2">
                        {currentUser?.perfis.map(p => (
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
                                    name="switch-perfil"
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
                                {currentUser.perfil_ativo === p.perfil && (
                                    <span className="ml-auto text-xs text-muted-foreground">atual</span>
                                )}
                            </label>
                        ))}
                    </div>

                    {switchError && (
                        <p className="text-sm text-destructive">{switchError}</p>
                    )}

                    <div className="flex gap-2">
                        <button
                            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                            onClick={() => setSwitchDialogOpen(false)}
                            disabled={switching}
                        >
                            Cancelar
                        </button>
                        <button
                            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                            onClick={handleSwitchPerfil}
                            disabled={switching || !selectedPerfil}
                        >
                            {switching ? "Trocando..." : "Confirmar"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser)
    const [openCadastros, setOpenCadastros] = useState(false)

    // Redireciona para login se não autenticado
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/", { replace: true })
        }
    }, [navigate])

    useEffect(() => {
        if (location.pathname.startsWith("/cadastrar")) {
            setOpenCadastros(true)
        }
    }, [location.pathname])

    // Atualiza dados do usuário ao navegar
    useEffect(() => {
        setCurrentUser(getCurrentUser())
    }, [location.pathname])

    const handleLogout = () => {
        authLogout()
        navigate("/")
    }

    return (
        <TooltipProvider>
            <SidebarProvider className="bg-sidebar">
                <SidebarConsumer
                    openCadastros={openCadastros}
                    setOpenCadastros={setOpenCadastros}
                    pathname={location.pathname}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onUserUpdated={setCurrentUser}
                />
            </SidebarProvider>
        </TooltipProvider>
    )
}
