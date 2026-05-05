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
import logo from "@/assets/logo_aeroclube2.svg"
import logoIcon from "/public/logo_icon.svg"
import { useEffect, useState } from "react"

export default function Layout() {
    const location = useLocation();
    const user =
        location.state?.user ||
        localStorage.getItem("user")
    const navigate = useNavigate();




    const [openCadastros, setopenCadastros] = useState(false)

    useEffect(() => {
        if (location.pathname.startsWith("/cadastrar")) {
            setopenCadastros(true)
        }
    }, [location.pathname])

    function SidebarConsumer() {
        const { state, isMobile, setOpen } = useSidebar()
        const isCollapsed = state === "collapsed"

        return (
            <>

                <Sidebar collapsible="icon">
                    {/* HEADER */}
                    <SidebarHeader className="flex items-center justify-center pt-5 h-[90px]">
                        <img
                            src={isCollapsed ? logoIcon : logo}
                            alt="Logo aeroclube"
                            className="h-full object-contain"
                        />
                    </SidebarHeader>

                    <SidebarContent>
                        {/* GRUPO 1 */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Geral</SidebarGroupLabel>

                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={location.pathname === "/dashboard"}
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
                                        isActive={location.pathname === "/usuarios"}
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
                                        isActive={location.pathname === "/movimentacoes"}
                                        tooltip="Movimentações"
                                    >
                                        <Link to="/movimentacoes">

                                            <ChartSpline />
                                            <span>Movimentações</span>
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
                                        isActive={location.pathname.startsWith("/titulos-a-receber")}
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
                                        isActive={location.pathname.startsWith("/titulos-a-pagar")}
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



                        {/* GRUPO 2 COM SUBMENU */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Cadastros</SidebarGroupLabel>


                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => {
                                            if (isCollapsed) {
                                                setOpen(true)
                                                setopenCadastros(true)
                                                return
                                            }

                                            setopenCadastros(prev => !prev)
                                        }}
                                        className="flex justify-between"
                                        tooltip="Cadastrar"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FolderPlus />
                                            <span>Cadastrar</span>
                                        </div>

                                        {/* seta */}
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform ${openCadastros ? "rotate-180" : ""
                                                }`}
                                        />
                                    </SidebarMenuButton>

                                    {/* SUBMENU */}
                                    {openCadastros && (
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={location.pathname.startsWith("/funcionario")}
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
                                                    isActive={location.pathname.startsWith("/clientes")}
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
                                                    isActive={location.pathname.startsWith("/aeronaves")}
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
                                                    isActive={location.pathname.startsWith("/fornecedores")}
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
                                                    isActive={location.pathname.startsWith("/conta-fixa")}
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

                                <DropdownMenuItem onClick={() => {
                                    localStorage.removeItem("user")
                                    navigate("/")
                                }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarFooter>
                </Sidebar>

                {/* CONTEÚDO */}
                <SidebarInset>
                    <div className="p-8">
                        <SidebarTrigger />

                        <Outlet />
                    </div>
                </SidebarInset>
            </>
        )
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <SidebarConsumer />
            </SidebarProvider>
        </TooltipProvider>
    )
}