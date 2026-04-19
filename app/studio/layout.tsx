import { AppSidebar } from '@/components/studio/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ModelProvider } from '@/contexts/Models';
import { AgentsProvider } from '@/contexts/Agents';
import { fetchModels } from '@/hooks/model';
import { fetchAgents } from '@/hooks/useAgents';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {

  const models = await fetchModels();
  const agents = await fetchAgents();

  return (
    <ModelProvider initialModels={models}>
      <AgentsProvider initialAgents={agents}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <main className="flex flex-1 flex-col gap-4 md:gap-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </AgentsProvider>
    </ModelProvider>
  );
}
