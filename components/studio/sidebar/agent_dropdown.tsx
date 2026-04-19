import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { EllipsisVertical, Menu } from 'lucide-react';
type AgentProps = {
  agentType: 'agent' | 'subagent';
  agentId: string;
  onAddSubAgent?: (parentId: string) => void;
  onEditAgent?: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
};
export const AgentDropdown = ({
  agentType,
  agentId,
  onAddSubAgent,
  onEditAgent,
  onDeleteAgent,
}: AgentProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-1.5">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-50 felx">
        <DropdownMenuLabel className='ml-auto'>{agentType}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {agentType === 'agent' && (
            <DropdownMenuItem 
              onClick={() => onAddSubAgent?.(agentId)}
            >
              Add subagent
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => onEditAgent?.(agentId)}
          >
            Edit {agentType}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDeleteAgent?.(agentId)}
          className="text-red-500"
        >
          Delete {agentType}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
