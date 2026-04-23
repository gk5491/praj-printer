import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useRole } from "@/contexts/RoleContext";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: ReactNode }) {
  const { role } = useRole();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b bg-card px-2 gap-2 shrink-0">
            <SidebarTrigger className="h-7 w-7" />
            <div className="flex-1 flex items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search printers, jobs, users..."
                  className="h-7 pl-7 text-xs bg-muted/50 border-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="text-2xs capitalize">
                {role}
              </Badge>
              <button className="relative p-1.5 rounded-md hover:bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
