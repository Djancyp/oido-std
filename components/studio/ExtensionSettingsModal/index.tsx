'use client';

import * as React from 'react';
import { Save, Loader2, Eye, EyeOff, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface ExtensionSettingsContentProps {
  extensionName: string;
  onSaveSuccess: () => void;
}

export function ExtensionSettingsContent({
  extensionName,
  onSaveSuccess,
}: ExtensionSettingsContentProps) {
  const [loading, setLoading] = React.useState(false);
  const [showSensitive, setShowSensitive] = React.useState<Record<string, boolean>>({});

  // Logic to handle save
  const handleSave = async () => {
    setLoading(true);
    // ... your api.setExtensionSetting logic here ...
    setLoading(false);
    onSaveSuccess();
  };

  return (
    <div className="space-y-6">
      {/* 1. Connection Group */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-1">
          <Zap size={14} className="text-blue-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Connection
          </h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium ml-1">GMAIL_EMAIL</label>
            <Input placeholder="user@gmail.com" className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium ml-1">GMAIL_PASSWORD</label>
            <div className="relative">
              <Input type={showSensitive['pass'] ? 'text' : 'password'} className="pr-10 h-9" />
              <button
                type="button"
                onClick={() => setShowSensitive(p => ({ ...p, pass: !p.pass }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showSensitive['pass'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Permissions Group */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-1">
          <ShieldCheck size={14} className="text-green-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Permissions
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between p-2.5 rounded-md border bg-muted/20">
            <span className="text-xs font-medium">GMAIL_ALLOW_SEND</span>
            <Switch />
          </div>
        </div>
      </section>

      {/* Footer Action (Triggered inside the content) */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={loading} className="gap-2 w-full sm:w-auto">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
