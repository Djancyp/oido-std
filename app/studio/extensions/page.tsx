'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Trash2,
  Power,
  PowerOff,
  Settings,
  ChevronLeft,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExtensionSettingsContent } from '@/components/studio/ExtensionSettingsModal';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/Modal';
/* Mock API Client and Types 
  (Replace with your actual imports)
*/
export interface ExtensionInfo {
  name: string;
  version: string;
  description: string;
  source: string;
  source_type: string;
  status: 'enabled' | 'disabled';
  has_configuration: boolean;
  configurations?: any[];
}

export default function ExtensionsPage() {
  const router = useRouter();
  const [extensions, setExtensions] = React.useState<ExtensionInfo[]>(MOCK_EXTENSIONS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [installSource, setInstallSource] = React.useState('');
  const [configuringExtension, setConfiguringExtension] = React.useState<string | null>(null);

  // Filter Logic
  const filtered = extensions.filter(
    ext =>
      ext.name.toLowerCase().includes(search.toLowerCase()) ||
      ext.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (name: string) => {
    setExtensions(prev =>
      prev.map(ext =>
        ext.name === name
          ? { ...ext, status: ext.status === 'enabled' ? 'disabled' : 'enabled' }
          : ext
      )
    );
  };

  const handleUninstall = (name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      setExtensions(prev => prev.filter(ext => ext.name !== name));
    }
  };

  const { openModal, closeModal } = useModal();

  const handleOpenSettings = (name: string) => {
    openModal({
      title: `Configure ${name}`,
      description: 'Update your extension environment variables and permissions.',
      size: 'lg',
      content: (
        <ExtensionSettingsContent
          extensionName={name}
          onSaveSuccess={() => {
            console.log('Saved!');
            closeModal(); // Close the global modal on success
          }}
        />
      ),
      // We leave footer null because our content component
      // has its own internal footer for better mobile layout
      footer: null,
    });
  };
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-muted/10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/studio')}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Extensions</h1>
            <p className="text-xs text-muted-foreground">Manage your MCP servers and tools</p>
          </div>
        </div>
        <Button
          onClick={() => setShowInstall(true)}
          className="gap-2 shadow-lg transition-all active:scale-95"
        >
          <Plus size={16} />
          Install Extension
        </Button>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b space-y-4">
        <div className="relative group max-w-2xl">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <Input
            placeholder="Search installed extensions..."
            className="pl-10 h-10 bg-muted/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {showInstall && (
          <Card className="p-4 border-primary/20 bg-primary/5 animate-in slide-in-from-top-2">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="GitHub URL, local path, or @npm/package"
                value={installSource}
                onChange={e => setInstallSource(e.target.value)}
                className="bg-background"
              />
              <Button onClick={() => setShowInstall(false)}>Install</Button>
              <Button variant="ghost" onClick={() => setShowInstall(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              Example: <code className="text-primary">/home/user/my-mcp-server</code> or{' '}
              <code className="text-primary">https://github.com/...</code>
            </p>
          </Card>
        )}
      </div>

      {/* Grid Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-muted/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {filtered.map(ext => (
            <Card
              key={ext.name}
              className={cn(
                'group relative flex flex-col p-5 transition-all hover:shadow-md hover:border-primary/50',
                ext.status === 'disabled' && 'opacity-75 grayscale-[0.5]'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Package size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleUninstall(ext.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{ext.name}</h3>
                  <Badge variant="secondary" className="text-[10px] py-0 h-4">
                    v{ext.version}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
                  {ext.description}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      ext.status === 'enabled'
                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                        : 'bg-zinc-500'
                    )}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {ext.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    disabled={!ext.has_configuration}
                    onClick={() => handleOpenSettings(ext.name)}
                  >
                    <Settings size={12} />
                    Config
                  </Button>
                  <Button
                    variant={ext.status === 'enabled' ? 'secondary' : 'default'}
                    size="sm"
                    className="h-8 text-xs px-2"
                    onClick={() => handleToggleStatus(ext.name)}
                  >
                    {ext.status === 'enabled' ? <PowerOff size={14} /> : <Power size={14} />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

const MOCK_EXTENSIONS: ExtensionInfo[] = [
  {
    name: 'oido-gmail-mcp',
    version: '1.0.0',
    description: 'Send, receive, and search emails via IMAP/SMTP using MCP server protocol.',
    source: '/home/djan/.local/share/oido/extensions/oido-gmail-mcp',
    source_type: 'oido',
    status: 'enabled',
    has_configuration: true,
  },
  {
    name: 'oido-postgres-mcp',
    version: '1.0.0',
    description:
      'Execute SQL queries, list tables, and describe PostgreSQL database schemas via MCP server.',
    source: '/home/djan/.local/share/oido/extensions/oido-postgres-mcp',
    source_type: 'oido',
    status: 'enabled',
    has_configuration: true,
  },
];
