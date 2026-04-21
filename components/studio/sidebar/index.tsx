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
      <SidebarHeader className="border-b border-slate-200">
        <h1 className="font-bold text-xl">Oido Studio</h1>
        <Link
          href="/studio/providers"
          className="flex items-center gap-2 py-1 px-1 text-sm text-slate-600 hover:text-slate-900 hover:bg-sidebar-accent rounded transition-colors"
        >
          <KeyRound size={15} />
          Providers
        </Link>
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
