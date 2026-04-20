'use client';

import * as React from 'react';
import {
  Plus, Search, Trash2, Power, PowerOff, Settings,
  ChevronLeft, Package, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/Modal';
import { ExtensionSettingsContent } from '@/components/studio/ExtensionSettingsModal';
import {
  useExtensionsQuery,
  useInstallExtension,
  useEnableExtension,
  useDisableExtension,
  useUninstallExtension,
} from '@/hooks/extensions';
import { Extension } from '@/app/api/extensions/route';

interface Props {
  initialExtensions: Extension[];
}

export function ExtensionsClient({ initialExtensions }: Props) {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [search, setSearch] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [installSource, setInstallSource] = React.useState('');

  const { data: extensions = [] } = useExtensionsQuery({ initialData: initialExtensions });
  const install = useInstallExtension();
  const enable = useEnableExtension();
  const disable = useDisableExtension();
  const uninstall = useUninstallExtension();

  const filtered = extensions.filter(
    ext =>
      ext.name.toLowerCase().includes(search.toLowerCase()) ||
      ext.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (ext: Extension) => {
    if (ext.status === 'enabled') {
      disable.mutate(ext.name);
    } else {
      enable.mutate(ext.name);
    }
  };

  const handleUninstall = (name: string) => {
    if (confirm(`Remove ${name}? This cannot be undone.`)) {
      uninstall.mutate(name);
    }
  };

  const handleInstall = () => {
    if (!installSource.trim()) return;
    install.mutate(installSource.trim(), {
      onSuccess: () => {
        setInstallSource('');
        setShowInstall(false);
      },
    });
  };

  const handleOpenSettings = (name: string) => {
    openModal({
      title: `Configure ${name}`,
      description: 'Update extension environment variables and settings.',
      size: 'lg',
      content: (
        <ExtensionSettingsContent
          extensionName={name}
          onSaveSuccess={closeModal}
        />
      ),
      footer: null,
    });
  };

  const isPending = (name: string) =>
    (enable.isPending && enable.variables === name) ||
    (disable.isPending && disable.variables === name) ||
    (uninstall.isPending && uninstall.variables === name);

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
          onClick={() => setShowInstall(v => !v)}
          className="gap-2 shadow-lg transition-all active:scale-95"
        >
          <Plus size={16} />
          Install Extension
        </Button>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b space-y-3">
        <div className="relative group max-w-2xl">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <Input
            placeholder="Search extensions..."
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
                placeholder="GitHub URL, local path, or package name"
                value={installSource}
                onChange={e => setInstallSource(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInstall()}
                className="bg-background"
                disabled={install.isPending}
              />
              <Button onClick={handleInstall} disabled={install.isPending || !installSource.trim()}>
                {install.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Install'}
              </Button>
              <Button variant="ghost" onClick={() => setShowInstall(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              Example: <code className="text-primary">/home/user/my-mcp-server</code> or{' '}
              <code className="text-primary">https://github.com/user/repo</code>
            </p>
            {install.isError && (
              <p className="text-[11px] text-destructive mt-1 px-1">
                Install failed. Check the source and try again.
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto p-6 bg-muted/5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
            <Package size={40} className="opacity-20" />
            <p className="text-sm">
              {search ? 'No extensions match your search.' : 'No extensions installed.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {filtered.map(ext => (
              <Card
                key={ext.name}
                className={cn(
                  'group relative flex flex-col p-5 transition-all hover:shadow-md hover:border-primary/50',
                  ext.status === 'disabled' && 'opacity-70 grayscale-[0.4]'
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
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleUninstall(ext.name)}
                      disabled={isPending(ext.name)}
                    >
                      {uninstall.isPending && uninstall.variables === ext.name
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm truncate">{ext.name}</h3>
                    <Badge variant="secondary" className="text-[10px] py-0 h-4">
                      v{ext.version}
                    </Badge>
                    {ext.scope && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize">
                        {ext.scope}
                      </Badge>
                    )}
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
                          : 'bg-zinc-400'
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
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggle(ext)}
                      disabled={isPending(ext.name)}
                    >
                      {(enable.isPending && enable.variables === ext.name) ||
                      (disable.isPending && disable.variables === ext.name) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : ext.status === 'enabled' ? (
                        <PowerOff size={14} />
                      ) : (
                        <Power size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
