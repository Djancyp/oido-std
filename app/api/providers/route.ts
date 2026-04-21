import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);
const OIDO = process.env.OIDO_BIN || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';

export async function GET() {
  try {
    const { stdout } = await exec(OIDO, ['auth', 'status', '--json']);
    let parsed: unknown = {};
    try { parsed = JSON.parse(stdout.trim()); } catch {}
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Error in GET /api/providers:', err);
    return NextResponse.json({}, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json();
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
    const args = ['auth', 'login', '--provider', provider];
    if (apiKey) args.push('--api-key', apiKey);
    await exec(OIDO, args);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { provider } = await req.json();
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
    await exec(OIDO, ['auth', 'logout', '--provider', provider]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
