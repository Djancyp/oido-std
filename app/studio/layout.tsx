export const dynamic = 'force-dynamic';

import { AppSidebar } from '@/components/studio/sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ModelProvider } from '@/contexts/Models';
import { AgentsProvider } from '@/contexts/Agents';
import { ToolsProvider } from '@/contexts/Tools';
import { SkillsProvider } from '@/contexts/Skills';
import { fetchModels } from '@/hooks/model';
import { fetchAgents, fetchAllSessions, fetchTabConversation } from '@/hooks/useAgents';
import { fetchTools } from '@/hooks/tools';
import { fetchSkills } from '@/hooks/skills';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const [models, agents, sessions, tools, skills] = await Promise.all([
    fetchModels(),
    fetchAgents(),
    fetchAllSessions(),
    fetchTools(),
    fetchSkills(),
  ]);

  const firstAgent = agents[0];
  const firstTabId = firstAgent?.tab_ids?.[0];
  const initialConversation =
    firstAgent && firstTabId ? await fetchTabConversation(firstAgent.agent_id, firstTabId) : null;
  const session = await getServerSession(authOptions);

  return (
    <ModelProvider initialModels={models}>
      <ToolsProvider initialTools={tools}>
        <SkillsProvider initialSkills={skills}>
          <AgentsProvider
            initialAgents={agents}
            initialSessions={sessions}
            initialConversation={initialConversation}
          >
            <SidebarProvider defaultOpen={false}>
              <AppSidebar />
              <SidebarInset>
                <div className="md:hidden flex items-center px-3 py-2 border-b">
                  <SidebarTrigger />
                </div>
                <main className="flex flex-1 flex-col gap-4 md:gap-8">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </AgentsProvider>
        </SkillsProvider>
      </ToolsProvider>
    </ModelProvider>
  );
}
