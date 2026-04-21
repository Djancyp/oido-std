'use client';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';
import { Blocks, Cable, Command, Moon, Sun, Unplug, Workflow, Users } from 'lucide-react';
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

function FooterNav({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } | null }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/channels" className="flex w-full gap-2">
          <Cable size={18} />
          <span className="text-sm">Channels</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/extensions" className="flex w-full gap-2">
          <Blocks size={18} />
          <span className="text-sm">Extensions</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/extensions" className="flex w-full gap-2">
          <Unplug size={18} className="gap-2" />
          <span className="text-sm">Mcp</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/skills" className="flex gap-2 w-full">
          <Command size={18} />
          <span className="text-sm">Skills</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/pipelines" className="flex gap-2 w-full">
          <Workflow size={18} />
          <span className="text-sm">Pipelines</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/extensions" className="flex gap-2 w-full">
          <Workflow size={18} />
          <span className="text-sm">Cron Jobs</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded transition-colors border border-transparent active:border-slate-200">
        <Link href="/studio/teams" className="flex gap-2 w-full">
          <Users size={18} />
          <span className="text-sm">Team</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 py-1.5">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex w-full gap-2 items-center text-sm cursor-pointer hover:bg-sidebar-accent rounded px-1 py-0.5 transition-colors"
        >
          {mounted && resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{mounted && resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
      <div className="mt-2 w-full flex items-center gap-2 py-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="p-1.5 w-full justify-baseline items-center cursor-pointer"
            >
              <Avatar>
                <AvatarFallback>{user?.name?.[0] ?? 'O'}</AvatarFallback>
                <AvatarBadge className="bg-green-600 dark:bg-green-800" />
              </Avatar>
              <h1>{user?.name ?? 'Oido Studio'}</h1>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-50 felx">
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
