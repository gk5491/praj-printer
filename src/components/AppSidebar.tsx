import {
  LayoutDashboard, Printer, FileText, Users, ShieldCheck,
  BarChart3, Settings, ChevronDown, Lock, Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Quick Print", url: "/quick-print", icon: Zap },
  { title: "Printers", url: "/printers", icon: Printer },
  { title: "Print Jobs", url: "/print-jobs", icon: FileText },
  { title: "Users", url: "/users", icon: Users },
  { title: "Cost Control", url: "/cost-control", icon: ShieldCheck },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, setRole } = useRole();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-sidebar-primary" />
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">PrintGuard</span>
          </div>
        )}
        {collapsed && <Printer className="h-5 w-5 text-sidebar-primary mx-auto" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider text-sidebar-foreground/50">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter(item => {
                  if (role === "employee") {
                    return !["Users", "Cost Control", "Settings"].includes(item.title);
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent">
              <div className="h-6 w-6 rounded-full bg-sidebar-primary flex items-center justify-center text-2xs font-bold text-sidebar-primary-foreground">
                {role === "admin" ? "A" : "E"}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{role === "admin" ? "James Wilson" : "Sarah Chen"}</div>
                <div className="text-2xs text-sidebar-foreground/60 capitalize">{role}</div>
              </div>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setRole("admin")}>
                Switch to Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRole("employee")}>
                Switch to Employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
