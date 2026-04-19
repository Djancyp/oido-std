'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* =========================
   Types
========================= */
export type SelectOption = {
  value: string;
  label: string;
};

export type SelectOptionGroup = {
  groupLabel?: string;
  items: SelectOption[];
};

interface ReusableSearchSelectProps {
  options: SelectOptionGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/* =========================
   Component
========================= */
export function SearchSelect({
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  value,
  onValueChange,
  className,
}: ReusableSearchSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Flatten once
  const flatOptions = React.useMemo(() => options.flatMap(group => group.items), [options]);

  // Create lookup map (O(1) instead of find)
  const optionMap = React.useMemo(() => {
    const map = new Map<string, SelectOption>();
    flatOptions.forEach(opt => map.set(opt.value, opt));
    return map;
  }, [flatOptions]);

  const selectedLabel = value ? optionMap.get(value)?.label : undefined;

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
          >
            <span className="truncate">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 popover-content-width-same-as-trigger">
          <Command
            filter={(itemValue, search) => {
              const label = optionMap.get(itemValue)?.label ?? '';
              return label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder={searchPlaceholder} />

            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>

              {options.map((group, index) => (
                <React.Fragment key={group.groupLabel ?? index}>
                  <CommandGroup heading={group.groupLabel}>
                    {group.items.map(item => (
                      <CommandItem
                        key={item.value}
                        value={item.value}
                        onSelect={selectedValue => {
                          onValueChange(selectedValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === item.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {index < options.length - 1 && <CommandSeparator />}
                </React.Fragment>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
