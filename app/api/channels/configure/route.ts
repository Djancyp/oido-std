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

type ConfigureBody = {
  channel: string;
  [key: string]: string;
};

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const body: ConfigureBody = await req.json();
    const { channel, ...config } = body;
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 });

    const flags = Object.entries(config)
      .filter(([, v]) => v)
      .map(([k, v]) => `--${k} "${String(v).replace(/"/g, '\\"')}"`)
      .join(' ');

    const stdout = await runCmd(`${oido} channel configure ${channel} ${flags}`.trim());
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/channels/configure:', err);
    return NextResponse.json({ error: err.message || 'Failed to configure channel' }, { status: 500 });
  }
}
