import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { AgentsApi } from './agents-api';
import FooterNav from './footer_nav';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function AppSidebar() {
  const session = await getServerSession(authOptions);
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-slate-200">
        <h1 className="font-bold text-xl">Oido Studio</h1>
      </SidebarHeader>

      <SidebarContent>
        <AgentsApi />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200">
        <FooterNav user={session?.user ?? null} />
      </SidebarFooter>
    </Sidebar>
  );
}
