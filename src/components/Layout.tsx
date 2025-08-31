import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Leaf } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <header className="h-14 flex items-center border-b bg-card px-6">
        <SidebarTrigger className="mr-4" />
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">GreenMRV</h1>
        </div>
      </header>

      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};