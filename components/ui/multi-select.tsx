'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string; group?: string };

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...', className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const groups = React.useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const opt of options) {
      const g = opt.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return map;
  }, [options]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <span className="text-muted-foreground">
              {selected.length > 0 ? `${selected.length} selected` : placeholder}
            </span>
            <ChevronsUpDown size={12} className="opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              {Array.from(groups.entries()).map(([group, opts]) => (
                <CommandGroup key={group} heading={group || undefined}>
                  {opts.map(opt => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => toggle(opt.value)}
                      data-checked={selected.includes(opt.value)}
                    >
                      <Check
                        size={12}
                        className={cn('mr-1 shrink-0', selected.includes(opt.value) ? 'opacity-100' : 'opacity-0')}
                      />
                      <span className="font-mono">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(v => (
            <Badge key={v} variant="secondary" className="text-[11px] gap-1 pr-1 font-mono">
              {v}
              <button
                type="button"
                onClick={() => toggle(v)}
                className="hover:text-destructive"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface SingleSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SingleSelect({ options, value, onChange, placeholder = 'Select...', className }: SingleSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => o.value === value);

  const groups = React.useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const opt of options) {
      const g = opt.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return map;
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring',
            className
          )}
        >
          <span className={cn('font-mono', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown size={12} className="opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {Array.from(groups.entries()).map(([group, opts]) => (
              <CommandGroup key={group} heading={group || undefined}>
                {opts.map(opt => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => { onChange(opt.value); setOpen(false); }}
                    data-checked={value === opt.value}
                  >
                    <Check
                      size={12}
                      className={cn('mr-1 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="font-mono">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
