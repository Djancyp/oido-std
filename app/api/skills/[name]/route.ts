import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function run(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

type Params = { params: Promise<{ name: string }> };

/* GET — show one skill */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const oido = getOido();
    const stdout = await run(`${oido} skills show "${name}" --json`);
    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err: any) {
    console.error('GET /api/skills/[name]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* PUT — update skill (uninstall + re-add) */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const oido = getOido();
    const { description, body = '', scope = 'user', tools = [] } = await req.json();

    // Uninstall existing (best-effort — may not exist if it was bundled)
    try { await run(`${oido} skills uninstall "${name}"`); } catch {}

    const toolFlags = (tools as string[]).map(t => `--tools "${t}"`).join(' ');
    const safeBody = body.replace(/'/g, `'\\''`);
    await run(`${oido} skills add "${name}" --description "${description}" --scope ${scope} ${toolFlags} --body '${safeBody}'`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PUT /api/skills/[name]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* DELETE — uninstall skill */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const oido = getOido();
    await run(`${oido} skills uninstall "${name}"`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/skills/[name]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
