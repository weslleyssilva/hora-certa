import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Ticket,
  Package,
  LogOut,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/admin/clients", icon: Building2 },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Contratos", url: "/admin/contracts", icon: FileText },
  { title: "Atendimentos", url: "/admin/tickets", icon: Ticket },
  { title: "Produtos", url: "/admin/products", icon: Package },
];

const clientMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chamados", url: "/tickets", icon: Ticket },
  { title: "Produtos", url: "/products", icon: Package },
];

function AppSidebarContent() {
  const { isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar
      className={cn(
        "border-r border-border/50 bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{APP_NAME}</span>
              <span className="text-xs text-muted-foreground">
                {isAdmin ? "Administração" : "Portal do Cliente"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive(item.url)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!collapsed && profile && (
          <div className="mb-3 flex flex-col">
            <span className="text-xs text-muted-foreground">Logado como</span>
            <span className="text-sm font-medium truncate">
              {profile.email}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebarContent />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border/50 bg-background px-6">
            <SidebarTrigger />
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
