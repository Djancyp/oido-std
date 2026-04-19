import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { AgentsApi } from './agents-api';
import { SearchSelect } from '../ModelSelector';
import { Plus } from 'lucide-react';
import FooterNav from './footer_nav';

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-slate-200">
        <h1 className="font-bold text-xl">Oido Studio</h1>
      </SidebarHeader>

      <SidebarContent>
        <AgentsApi />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200">
        <FooterNav />
      </SidebarFooter>
    </Sidebar>
  );
}
