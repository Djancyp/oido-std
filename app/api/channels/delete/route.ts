import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';

export const runtime = 'nodejs';

function channelsPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config');
  return path.join(configHome, 'oido', 'channels.json');
}

export async function DELETE(req: NextRequest) {
  try {
    const { channel } = await req.json();
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 });

    const file = channelsPath();
    const raw = await fs.readFile(file, 'utf-8');
    const data: Record<string, unknown> = JSON.parse(raw);

    if (!(channel in data)) {
      return NextResponse.json({ error: 'channel not found' }, { status: 404 });
    }

    delete data[channel];
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/channels/delete:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete channel' }, { status: 500 });
  }
}
