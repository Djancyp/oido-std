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

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { channel } = await req.json();
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 });

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(`${oido} channel start ${channel}`).catch(e => ({
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message,
    }));

    return NextResponse.json({ success: true, output: stdout || stderr });
  } catch (err: any) {
    console.error('Error in POST /api/channels/start:', err);
    return NextResponse.json({ error: err.message || 'Failed to start channel' }, { status: 500 });
  }
}
