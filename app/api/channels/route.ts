import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const { stdout } = await execAsync(cmd);
  return stdout;
}

export type Channel = {
  name: string;
  type: 'telegram' | 'discord' | 'weixin' | 'dingtalk' | string;
  state: 'running' | 'stopped' | 'error' | string;
  config: Record<string, string>;
  lastStarted?: string;
  senderPolicy?: string;
  sessionScope?: string;
  dispatchMode?: string;
};

/* GET: list channels */
export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runCmd(`${oido} channel list --json`);
    const channels: Channel[] = JSON.parse(stdout);
    return NextResponse.json<Channel[]>(channels);
  } catch (err: any) {
    console.error('Error in GET /api/channels:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch channels' }, { status: 500 });
  }
}
