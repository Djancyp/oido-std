import { AppSidebar } from '@/components/studio/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
