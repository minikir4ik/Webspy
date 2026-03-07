import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AnomalyBell } from "@/components/anomaly-bell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-card px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <AnomalyBell />
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
