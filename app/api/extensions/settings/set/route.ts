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
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');
    
    const body: { name: string; key: string; value: string } = await req.json();

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
    console.error('Error in POST /api/extensions/settings/set:', err);
    return NextResponse.json({ error: err.message || 'Failed to set settings' }, { status: 500 });
  }
}
