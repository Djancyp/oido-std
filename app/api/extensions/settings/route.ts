import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Define the run function here since it's only used server-side
async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const { stdout } = await execAsync(cmd);
  return stdout;
}

export type SettingsGetBody = {
  name: string;
  key: string;
};

export type SettingsListBody = {
  name: string;
};

export type SettingsSetBody = {
  name: string;
  key: string;
  value: string;
};
/* =========================
   GET (get or list)
========================= */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const name = url.searchParams.get('name');
    const key = url.searchParams.get('key');
    const list = url.searchParams.get('list');

    if (list && name) {
      const oido = process.env.OIDO_PATH;
      if (!oido) throw new Error('OIDO_PATH is not defined');
      
      const stdout = await runCmd(`${oido} extensions settings list ${name}`);

      return NextResponse.json(JSON.parse(stdout));
    }

    if (name && key) {
      const oido = process.env.OIDO_PATH;
      if (!oido) throw new Error('OIDO_PATH is not defined');
      
      const stdout = await runCmd(`${oido} extensions settings get ${name} ${key}`);

      return NextResponse.json({ value: stdout.trim() });
    }

    return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in GET /api/extensions/settings:', err);
    return NextResponse.json({ error: err.message || 'Failed to get settings' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');
    
    const body: SettingsSetBody = await req.json();

    if (!body.name || !body.key) {
      return NextResponse.json({ error: 'name and key required' }, { status: 400 });
    }

    const command = `${oido} extensions settings set ${body.name} ${body.key} "${body.value}"`;

    const stdout = await runCmd(command);

    return NextResponse.json({
      success: true,
      output: stdout,
    });
  } catch (err: any) {
    console.error('Error in POST /api/extensions/settings:', err);
    return NextResponse.json({ error: err.message || 'Failed to set settings' }, { status: 500 });
  }
}
