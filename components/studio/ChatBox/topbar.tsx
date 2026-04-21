import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, X, Plus } from 'lucide-react';
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
      <div className="flex items-center px-2 bg-background border-b border-border pt-3">
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="bg-transparent border-none h-10 justify-start p-0 gap-1 flex-nowrap inline-flex">
              {sessions.map(session => (
                <TabsTrigger
                  key={session.id}
                  value={session.id}
                  className="group relative data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 h-8 gap-1.5 border shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span className="max-w-[80px] truncate text-xs">
                    {session.title}
                  </span>
                  {sessions.length > 1 && (
                    <span
                      className="w-3.5 h-3.5 shrink-0 flex items-center justify-center rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={e => {
                        e.stopPropagation();
                        removeTab(session.id, e);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted rounded-md ml-2">
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
