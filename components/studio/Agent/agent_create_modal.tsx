'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useModal } from '@/contexts/Modal';
import { useModels } from '@/contexts/Models';

type CreateAgentButtonProps = {
  handleCreateAgent: (name: string) => void;
};

export const CreateAgentModal = ({ handleCreateAgent }: CreateAgentButtonProps) => {
	const {models} = useModels();
  const { openModal, closeModal } = useModal();
  const [name, setName] = useState('');

  const onConfirm = (agentName: string) => {
    if (agentName.trim()) {
      handleCreateAgent(agentName.trim());
      closeModal();
      setName(''); // Reset local state
    }
  };

  const handleOpenModal = () => {
    openModal({
      title: 'Create New Agent',
      description: 'Enter a name for your new agent',
      size: 'md',
      content: (
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              placeholder="e.g. Customer Support Lead"
              autoFocus
              // We use a local variable or a callback for the input
              // since state updates inside a JSX-prop-modal can be tricky
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onConfirm((e.target as HTMLInputElement).value);
                }
              }}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </div>
      ),
      footer: (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={closeModal}>
            Cancele
          </Button>
          <Button
            onClick={() => {
              // Use the state 'name' we captured via onChange
              onConfirm(name);
            }}
          >
            Create Agent
          </Button>
        </div>
      ),
    });
  };

  return <Button onClick={handleOpenModal}>Create Agent</Button>;
};
