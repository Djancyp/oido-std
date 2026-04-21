import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const oido = getOido();
    const { name } = await params;
    const { spawn } = await import('child_process');

    const stream = new ReadableStream({
      start(controller) {
        const proc = spawn(oido, ['pipelines', 'run', name, '--json']);
        const encode = (s: string) => new TextEncoder().encode(`data: ${s}\n\n`);

        proc.stdout.on('data', (chunk: Buffer) => controller.enqueue(encode(chunk.toString())));
        proc.stderr.on('data', (chunk: Buffer) => controller.enqueue(encode(JSON.stringify({ error: chunk.toString() }))));
        proc.on('close', (code) => {
          controller.enqueue(encode(JSON.stringify({ done: true, exitCode: code })));
          controller.close();
        });
        proc.on('error', (err) => {
          controller.enqueue(encode(JSON.stringify({ error: err.message })));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
