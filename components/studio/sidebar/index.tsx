import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger } from '@/components/ui/sidebar';
import { AgentsApi } from './agents-api';
import FooterNav from './footer_nav';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Bot } from 'lucide-react';

export async function AppSidebar() {
  const session = await getServerSession(authOptions);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border">
        {/* Expanded: logo + trigger */}
        <div className="group-data-[collapsible=icon]:hidden flex items-center justify-between px-1">
          <h1 className="font-bold text-xl">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-2xl rounded-tr-none shadow-sm mr-1">
              O
            </span>
            ido Studio
          </h1>
          <SidebarTrigger className="shrink-0" />
        </div>
        {/* Collapsed: just the trigger centered */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Expanded: full agents list */}
        <div className="group-data-[collapsible=icon]:hidden h-full overflow-hidden">
          <AgentsApi />
        </div>
        {/* Collapsed: bot icon hint */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-3 text-muted-foreground">
          <Bot size={18} />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <FooterNav user={session?.user ?? null} />
      </SidebarFooter>
    </Sidebar>
  );
}
