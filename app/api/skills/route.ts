import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function run(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

export type Skill = {
  name: string;
  description: string;
  level: 'user' | 'project' | 'bundled' | 'extension';
  filePath: string;
  body: string;
  tools?: string[];
};

/* GET — list all skills */
export async function GET() {
  try {
    const oido = getOido();
    const stdout = await run(`${oido} skills list --json`);
    const trimmed = stdout.trim();
    // CLI prints plain text when no skills exist
    if (!trimmed.startsWith('[')) return NextResponse.json<Skill[]>([]);
    return NextResponse.json<Skill[]>(JSON.parse(trimmed));
  } catch (err: any) {
    console.error('GET /api/skills:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* POST — create skill */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, description, body = '', scope = 'user', tools = [] } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    const toolFlags = (tools as string[]).map(t => `--tools "${t}"`).join(' ');
    // Escape body for shell: wrap in single quotes, escape inner single quotes
    const safeBody = body.replace(/'/g, `'\\''`);
    const cmd = `${oido} skills add "${name}" --description "${description}" --scope ${scope} ${toolFlags} --body '${safeBody}'`;

    await run(cmd);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/skills:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
