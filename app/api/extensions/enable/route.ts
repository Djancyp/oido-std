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

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');
    
    const stdout = await runCmd(`${oido} extensions enable ${name}`);

    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/extensions/enable:', err);
    return NextResponse.json({ error: err.message || 'Failed to enable extension' }, { status: 500 });
  }
}
