'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useExtensionSettings, useSaveExtensionSetting } from '@/hooks/extensions';

interface Props {
  extensionName: string;
  onSaveSuccess?: () => void;
}

function isBool(value: string, type?: string): boolean {
  if (type === 'bool' || type === 'boolean') return true;
  return value === 'true' || value === 'false';
}

export function ExtensionSettingsContent({ extensionName, onSaveSuccess }: Props) {
  const { data: settings, isLoading } = useExtensionSettings(extensionName);
  const save = useSaveExtensionSetting();
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (settings && Array.isArray(settings)) {
      const initial: Record<string, string> = {};
      settings.forEach((s: any) => { initial[s.key ?? s.envVar] = s.value ?? ''; });
      setValues(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    await Promise.all(
      Object.entries(values).map(([key, value]) =>
        save.mutateAsync({ name: extensionName, key, value })
      )
    );
    onSaveSuccess?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configs: any[] = Array.isArray(settings) ? settings : [];

  if (configs.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No configurable settings for this extension.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
        {configs.map((cfg: any) => {
          const key = cfg.key ?? cfg.envVar;
          const val = values[key] ?? '';
          const bool = isBool(val, cfg.type);

          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">{key}</label>
              {cfg.description && (
                <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
              )}
              {bool ? (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={val === 'true'}
                    onCheckedChange={checked =>
                      setValues(prev => ({ ...prev, [key]: checked ? 'true' : 'false' }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">{val === 'true' ? 'Enabled' : 'Disabled'}</span>
                </div>
              ) : (
                <Input
                  value={val}
                  onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${key}`}
                  className="h-9 font-mono text-xs"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-3 mt-3 border-t shrink-0">
        <Button onClick={handleSave} disabled={save.isPending} className="gap-2 h-9">
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
