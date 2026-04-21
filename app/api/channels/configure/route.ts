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
  type: string;
  settings: Record<string, string>;
  model?: string;
  instructions?: string;
  policy?: string;
  scope?: string;
  dispatch?: string;
  allow?: string;
};

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const body: ConfigureBody = await req.json();
    const { channel, type, settings = {}, model, instructions, policy, scope, dispatch, allow } = body;
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 });
    if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 });

    const setFlags = Object.entries(settings)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `--set ${k}=${String(v).replace(/ /g, '\\ ')}`)
      .join(' ');

    const optFlags = [
      model ? `--model ${model}` : '',
      instructions ? `--instructions ${JSON.stringify(instructions)}` : '',
      policy ? `--policy ${policy}` : '',
      scope ? `--scope ${scope}` : '',
      dispatch ? `--dispatch ${dispatch}` : '',
      allow ? `--allow ${allow}` : '',
    ].filter(Boolean).join(' ');

    const cmd = `${oido} channel configure ${channel} --type ${type}${setFlags ? ' ' + setFlags : ''}${optFlags ? ' ' + optFlags : ''}`;
    const stdout = await runCmd(cmd);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/channels/configure:', err);
    return NextResponse.json({ error: err.message || 'Failed to configure channel' }, { status: 500 });
  }
}
