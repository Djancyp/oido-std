import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { AgentsApi } from './agents-api';
import FooterNav from './footer_nav';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';

export async function AppSidebar() {
  const session = await getServerSession(authOptions);
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border">
        <h1 className="font-bold text-xl">Oido Studio</h1>
      </SidebarHeader>

      <SidebarContent>
        <AgentsApi />
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <FooterNav user={session?.user ?? null} />
      </SidebarFooter>
    </Sidebar>
  );
}
