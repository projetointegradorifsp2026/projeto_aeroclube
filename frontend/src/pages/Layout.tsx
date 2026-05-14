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
    SidebarSeparator,
    useSidebar
} from "@/components/ui/sidebar"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

import { TooltipProvider } from "@/components/ui/tooltip"

import { ChevronsUpDown, LogOut, User, ChevronDown, ChartSpline, FileInput, FileOutput, Plane, UserPlus, ChartNoAxesColumnIncreasing, FolderPlus, FileUser, Truck, DollarSign } from "lucide-react"

import {
    Home,
    Users,
    Settings,
    Folder,
    FileText,
    BarChart,
} from "lucide-react"

import { Link, useLocation, useNavigate } from "react-router-dom"
import { Outlet } from "react-router-dom"
import logoIcon from "/logo_icon.svg"
import { useEffect, useState } from "react"

interface SidebarConsumerProps {
    openCadastros: boolean
    setOpenCadastros: React.Dispatch<React.SetStateAction<boolean>>
    pathname: string
    user: string | null
    onLogout: () => void
}

function SidebarConsumer({ openCadastros, setOpenCadastros, pathname, user, onLogout }: SidebarConsumerProps) {
    const { state, isMobile, setOpen } = useSidebar()
    const isCollapsed = state === "collapsed"

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
                    {/* GRUPO 1 */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Geral</SidebarGroupLabel>

                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === "/dashboard"}
                                    tooltip="Dashboard"
                                >
                                    <Link to="/dashboard">
                                        <ChartNoAxesColumnIncreasing />
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === "/usuarios"}
                                    tooltip="Usuários"
                                >
                                    <Link to="/usuarios">
                                        <Users />
                                        <span>Usuários</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === "/movimentacoes"}
                                    tooltip="Movimentações"
                                >
                                    <Link to="/movimentacoes">
                                        <ChartSpline />
                                        <span>Movimentações</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === "/voos"}
                                    tooltip="Voos"
                                >
                                    <Link to="/voos">
                                        <Plane />
                                        <span>Voos</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Títulos</SidebarGroupLabel>

                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.startsWith("/titulos-a-receber")}
                                    tooltip="Títulos a receber"
                                >
                                    <Link to="/titulos-a-receber">
                                        <FileInput />
                                        <span>Títulos a receber</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.startsWith("/titulos-a-pagar")}
                                    tooltip="Títulos a pagar"
                                >
                                    <Link to="/titulos-a-pagar">
                                        <FileOutput />
                                        <span>Títulos a pagar</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>

                    {/* GRUPO CADASTROS COM SUBMENU */}
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
                                    className="flex justify-between"
                                    tooltip="Cadastrar"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FolderPlus className="shrink-0" />
                                        <span className="group-data-[collapsible=icon]:hidden truncate">Cadastrar</span>
                                    </div>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden ${openCadastros ? "rotate-180" : ""}`}
                                    />
                                </SidebarMenuButton>

                                {openCadastros && (
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={pathname.startsWith("/funcionario")}
                                            >
                                                <Link to="/funcionario">
                                                    <UserPlus />
                                                    <span>Funcionários</span>
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
                </SidebarContent>

                {/* FOOTER */}
                <SidebarFooter>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center justify-between gap-2 rounded-md p-2 hover:bg-sidebar-accent overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src="" />
                                        <AvatarFallback>
                                            {user?.[0]?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>

                                    {(!isCollapsed || isMobile) && (
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-medium truncate text-start">
                                                {user || "Usuário"}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate text-start">
                                                {user || "email@exemplo.com"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                                )}
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </DropdownMenuItem>

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
        </>
    )
}

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const user = location.state?.user || localStorage.getItem("user")

    const [openCadastros, setOpenCadastros] = useState(false)

    useEffect(() => {
        if (location.pathname.startsWith("/cadastrar")) {
            setOpenCadastros(true)
        }
    }, [location.pathname])

    const handleLogout = () => {
        localStorage.removeItem("user")
        navigate("/")
    }

    return (
        <TooltipProvider>
            <SidebarProvider className="bg-sidebar">
                <SidebarConsumer
                    openCadastros={openCadastros}
                    setOpenCadastros={setOpenCadastros}
                    pathname={location.pathname}
                    user={user}
                    onLogout={handleLogout}
                />
            </SidebarProvider>
        </TooltipProvider>
    )
}