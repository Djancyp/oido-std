'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAgents, useCreateAgent, useDeleteAgent } from '@/hooks/useAgents';
import { useModal } from '@/contexts/Modal';
import { CreateAgentModal } from '@/components/studio/Agent/agent_create_modal';

// Types
type Agent = {
  agent_id: string;
  agent_name: string;
  tab_ids: string[];
  exclude_tools: string[];
  skills: string[];
  subagents: Agent[];
};

export default function AgentsPage() {
  const { data: agents, isLoading, isError, error, refetch } = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const { openModal } = useModal();

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleCreateAgent = (name: string) => {
    if (!name.trim()) return;

    createAgent.mutate(name, {
      onSuccess: () => {
        // Refresh the list after successful creation
        refetch();
      },
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    deleteAgent.mutate(agentId, {
      onSuccess: () => {
        // Refresh the list after successful deletion
        refetch();
        setIsDeleting(null);
      },
    });
  };

  const handleViewDetails = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Agents</h1>
        <p>Loading agents...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Agents</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong>Error:</strong> {(error as Error).message}
        </div>
      </div>
    );
  }

  return <CreateAgentModal handleCreateAgent={handleCreateAgent} />;
}

