import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, X, Plus, Settings, MoreVertical } from 'lucide-react';
import { ChatSession } from '.';

type TabProps = {
  sessions: ChatSession[];
  removeTab: (id: string, e: React.MouseEvent) => void;
  addNewTab: () => void;
  activeTab: string;
  setActiveTab: (id: string) => void;
  agentInfo?: {
    name: string;
    model: string;
  };
};

function TopBar({
  sessions,
  removeTab,
  addNewTab,
  activeTab,
  setActiveTab,
  agentInfo,
}: TabProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center px-2 bg-slate-50 border-b border-sidebar-border pt-3">
        <div className="flex items-center flex-1 overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="bg-transparent border-none h-10 justify-start p-0 gap-1">
              {sessions.map(session => (
                <TabsTrigger
                  key={session.id}
                  value={session.id}
                  className="group relative data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 h-8 gap-2 border"
                >
                  <MessageSquare className="w-3.5 h-3.5 opacity-60" />
                  <span className="max-w-[80px] truncate text-xs">
                    {session.title}
                  </span>

                  {sessions.length > 1 && (
                    <X
                      className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        removeTab(session.id, e);
                      }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          <Button
            variant="ghost"
            size="icon"
            onClick={addNewTab}
            className="h-8 w-8 ml-1 shrink-0 hover:bg-background border border-dashed"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Agent Info Display */}
        {agentInfo && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-100 rounded-md ml-2">
            <span className="font-medium">{agentInfo.name}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{agentInfo.model}</span>
          </div>
        )}
      </div>
    </Tabs>
  );
}

export default TopBar;
