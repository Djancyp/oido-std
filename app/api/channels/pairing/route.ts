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

export type PairingRequest = {
  id: string;
  channel: string;
  user: string;
  requested_at: string;
};

/* GET: list pairing requests */
export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runCmd(`${oido} channel pairing list --json`);
    let requests: PairingRequest[] = [];
    try { requests = JSON.parse(stdout.trim()); } catch {}
    return NextResponse.json<PairingRequest[]>(requests);
  } catch (err: any) {
    console.error('Error in GET /api/channels/pairing:', err);
    return NextResponse.json([], { status: 200 });
  }
}

/* POST: approve or reject pairing */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { id, action } = await req.json(); // action: 'approve' | 'reject'
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    const stdout = await runCmd(`${oido} channel pairing ${action} ${id}`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in POST /api/channels/pairing:', err);
    return NextResponse.json({ error: err.message || 'Failed to process pairing request' }, { status: 500 });
  }
}
