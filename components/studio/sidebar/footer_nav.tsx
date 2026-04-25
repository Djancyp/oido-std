'use client';
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';
import { Blocks, Cable, Command, Moon, Sun, Unplug, Users, KeyRound, Kanban } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; icon: LucideIcon; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: '/studio/providers',          icon: KeyRound,  label: 'Providers' },
  { href: '/studio/channels',           icon: Cable,     label: 'Channels' },
  { href: '/studio/extensions',         icon: Blocks,    label: 'Extensions' },
  { href: '/studio/mcp',                icon: Unplug,    label: 'MCP' },
  { href: '/studio/skills',             icon: Command,   label: 'Skills' },
  { href: '/studio/projects',           icon: Kanban,    label: 'Projects' },
  { href: '/studio/teams',              icon: Users,     label: 'Team' },
];

const ROW = 'border border-transparent active:border-border rounded transition-colors hover:bg-sidebar-accent';

function FooterNav({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
}) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ThemeIcon = mounted && resolvedTheme === 'dark' ? Sun : Moon;
  const themeLabel = mounted && resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode';

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col items-center gap-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link href={href} className={cn('flex justify-center p-2 w-full', ROW)}>
                  <Icon size={18} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn('flex justify-center p-2 w-full cursor-pointer', ROW)}
              >
                <ThemeIcon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{themeLabel}</TooltipContent>
          </Tooltip>

          {/* Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn('flex justify-center p-1.5 w-full cursor-pointer mt-1', ROW)}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{user?.name?.[0] ?? 'O'}</AvatarFallback>
                      <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" className="w-48">
                  <DropdownMenuLabel>{user?.name ?? 'Oido Studio'}</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="right">{user?.name ?? 'Oido Studio'}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <>
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
        <div key={href} className={cn('flex items-center gap-2 py-2 cursor-pointer', ROW)}>
          <Link href={href} className="flex w-full gap-2 items-center">
            <Icon size={18} />
            <span className="text-sm">{label}</span>
          </Link>
        </div>
      ))}

      <div className="flex items-center gap-2 py-1.5">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex w-full gap-2 items-center text-sm cursor-pointer hover:bg-sidebar-accent rounded px-1 py-0.5 transition-colors"
        >
          <ThemeIcon size={18} />
          <span>{themeLabel}</span>
        </button>
      </div>

      <div className="mt-2 w-full flex items-center gap-2 py-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1.5 w-full justify-baseline items-center cursor-pointer">
              <Avatar>
                <AvatarFallback>{user?.name?.[0] ?? 'O'}</AvatarFallback>
                <AvatarBadge className="bg-green-600 dark:bg-green-800" />
              </Avatar>
              <h1>{user?.name ?? 'Oido Studio'}</h1>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-50">
            <DropdownMenuLabel className="ml-auto">Profile</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export default FooterNav;
