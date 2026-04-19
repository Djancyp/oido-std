'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useAgents, useCreateAgent, useDeleteAgent } from '@/hooks/useAgents';
import { useModal } from '@/contexts/Modal';

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
      }
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    deleteAgent.mutate(agentId, {
      onSuccess: () => {
        // Refresh the list after successful deletion
        refetch();
        setIsDeleting(null);
      }
    });
  };

  const handleViewDetails = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  // Open modal for creating new agent
  const openCreateAgentModal = () => {
    openModal({
      title: 'Create New Agent',
      description: 'Enter a name for your new agent',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agent-name" className="text-right">
              Name
            </Label>
            <Input
              id="agent-name"
              className="col-span-3"
              placeholder="Enter agent name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  handleCreateAgent(input.value.trim());
                }
              }}
            />
          </div>
        </div>
      ),
      footer: (
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline"
            onClick={() => {}}
          >
            Cancel
          </Button>
          <Button 
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement;
              if (input?.value.trim()) {
                handleCreateAgent(input.value.trim());
              }
            }}
          >
            Create
          </Button>
        </div>
      ),
    });
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Button onClick={openCreateAgentModal}>Create Agent</Button>
      </div>

      {agents?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No agents found. Create your first agent!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map((agent) => (
                <TableRow key={agent.agent_id}>
                  <TableCell className="font-medium">{agent.agent_name}</TableCell>
                  <TableCell>{agent.agent_id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {agent.skills.length} skills
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(agent)}
                      >
                        View Details
                      </Button>
                      <AlertDialog open={isDeleting === agent.agent_id} onOpenChange={(open) => setIsDeleting(open ? agent.agent_id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">Delete</Button>
                        </DialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the agent "{agent.agent_name}" and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAgent(agent.agent_id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agent Details: {selectedAgent.agent_name}</DialogTitle>
              <DialogDescription>
                Detailed information about this agent.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Agent ID:</span>
                          <p className="text-sm">{selectedAgent.agent_id}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Name:</span>
                          <p className="text-sm">{selectedAgent.agent_name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Skills:</span>
                          <p className="text-sm">{selectedAgent.skills.length}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Tools:</span>
                          <p className="text-sm">{selectedAgent.exclude_tools.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Subagents</h3>
                  <Card>
                    <CardContent className="pt-4">
                      {selectedAgent.subagents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedAgent.subagents.map((subagent) => (
                            <div key={subagent.agent_id} className="border rounded p-2">
                              <div className="font-medium">{subagent.agent_name}</div>
                              <div className="text-sm text-gray-500">ID: {subagent.agent_id}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No subagents</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                {selectedAgent.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No skills assigned</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Tools</h3>
                {selectedAgent.exclude_tools.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.exclude_tools.map((tool, index) => (
                      <Badge key={index} variant="outline">{tool}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No excluded tools</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedAgent(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}