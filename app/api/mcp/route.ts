import { NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execCb);
async function runCmd(cmd: string) {
  const { stdout } = await execAsync(cmd);
  return stdout;
}

export const runtime = 'nodejs';

export type McpServer = {
  name: string;
  type: 'stdio' | 'sse';
  enabled: boolean;
  scope: 'user' | 'project';
  command?: string;
  args?: string[];
  url?: string;
  description?: string;
  env?: Record<string, string>;
};

export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runCmd(`${oido} mcp list --json`);
    let servers: McpServer[] = [];
    try { servers = JSON.parse(stdout.trim()) ?? []; } catch {}
    return NextResponse.json<McpServer[]>(Array.isArray(servers) ? servers : []);
  } catch (err: any) {
    console.error('Error in GET /api/mcp:', err);
    return NextResponse.json([], { status: 200 });
  }
}
