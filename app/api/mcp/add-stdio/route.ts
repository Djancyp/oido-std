import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';
const execAsync = promisify(execCb);

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, command, args = [], env = [], description, scope = 'user' } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!command) return NextResponse.json({ error: 'command is required' }, { status: 400 });

    const argFlags = args.length ? args.map((a: string) => `--args ${JSON.stringify(a)}`).join(' ') : '';
    const envFlags = env.length ? env.map((e: string) => `--env ${JSON.stringify(e)}`).join(' ') : '';
    const descFlag = description ? `--description ${JSON.stringify(description)}` : '';
    const cmd = `${oido} mcp add-stdio ${name} --command ${JSON.stringify(command)} ${argFlags} ${envFlags} ${descFlag} --scope ${scope}`.replace(/\s+/g, ' ').trim();

    const { stdout } = await execAsync(cmd);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/mcp/add-stdio:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
