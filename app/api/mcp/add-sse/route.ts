import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';
const execAsync = promisify(execCb);

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, url, authUrl, tokenUrl, scopes = [], env = [], description, scope = 'user' } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const envFlags = env.length ? env.map((e: string) => `--env ${JSON.stringify(e)}`).join(' ') : '';
    const authFlag = authUrl ? `--auth-url ${JSON.stringify(authUrl)}` : '';
    const tokenFlag = tokenUrl ? `--token-url ${JSON.stringify(tokenUrl)}` : '';
    const scopesFlag = scopes.length ? `--scopes ${scopes.join(',')}` : '';
    const descFlag = description ? `--description ${JSON.stringify(description)}` : '';
    const cmd = `${oido} mcp add-sse ${name} --url ${JSON.stringify(url)} ${envFlags} ${authFlag} ${tokenFlag} ${scopesFlag} ${descFlag} --scope ${scope}`.replace(/\s+/g, ' ').trim();

    const { stdout } = await execAsync(cmd);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/mcp/add-sse:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
