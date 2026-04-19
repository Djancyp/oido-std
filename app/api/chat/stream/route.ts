import { NextRequest } from 'next/server';
import * as pty from 'node-pty';

export const runtime = 'nodejs';

type ChatRequest = {
  message: string;
  agentId?: string;
  tabId?: string;
  model?: string;
  systemPrompt?: string;
  conversationId?: number;
  sessionId?: string;
  continue?: boolean;
  approvalMode?: 'yolo' | 'auto-edit' | 'plan';
};

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();

  if (!body.message) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  const conversationId = body.conversationId ?? Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {}
      };

      const send = (data: unknown) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'conversation_created', conversation_id: conversationId });

      const args: string[] = ['--output-format', 'stream-json', '--channel', 'CI'];

      if (body.sessionId) args.push('-r', body.sessionId, '-p', body.message);
      else if (body.continue) args.push('-c', '-p', body.message);
      else args.push('-p', body.message);

      if (body.agentId) args.push('--agent-id', body.agentId);
      if (body.tabId) args.push('--tab-id', body.tabId);

      if (body.approvalMode === 'yolo') args.push('-y');
      if (body.approvalMode === 'auto-edit') args.push('--approval-mode', 'auto-edit');
      if (body.approvalMode === 'plan') args.push('--approval-mode', 'plan');

      args.push('-m', body.model ?? 'openrouter/free');
      if (body.systemPrompt) args.push('--system-prompt', body.systemPrompt);

      const child = pty.spawn('/home/djan/Documents/codding/agent-cli/oido-cli/oido', args, {
        name: 'xterm-256color',
        cols: 10000, // ← very wide: prevents line-wrapping of long JSON
        rows: 50,
        env: {
          ...(process.env as Record<string, string>),
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      });

      console.log('[DEBUG] Spawned pty PID:', child.pid);

      const hardTimeout = setTimeout(() => {
        console.warn('[DEBUG] Hard 30s timeout');
        send({ type: 'error', message: 'Timeout: no response from oido' });
        safeClose();
        child.kill();
      }, 30_000);

      let lineBuffer = '';
      let rawLog = ''; // ← accumulate everything for diagnosis

      child.onData((raw: string) => {
        // Log the raw bytes (hex) so we can see exactly what the PTY sends
        const hex = Buffer.from(raw).toString('hex');
        console.log('[RAW hex]', hex);
        console.log('[RAW str]', JSON.stringify(raw)); // shows \r, \n, escapes

        rawLog += raw;

        const cleaned = raw
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1B\][^\x07]*(\x07|\x1B\\)/g, '')
          // Strip any remaining ESC sequences
          .replace(/\x1B[@-Z\\-_]/g, '')
          .replace(/\x1B\[[\x00-\x7F]*?[A-Za-z]/g, '');

        lineBuffer += cleaned;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        console.log('[DEBUG] lineBuffer after chunk, pending:', JSON.stringify(lineBuffer));

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          console.log(
            '[DEBUG] Attempting parse, length:',
            trimmed.length,
            'preview:',
            trimmed.slice(0, 120)
          );
          try {
            handleMessage(JSON.parse(trimmed));
          } catch (e) {
            console.warn('[DEBUG] JSON parse failed:', (e as Error).message);
            console.warn('[DEBUG] Failed line (first 300 chars):', trimmed.slice(0, 300));
            console.warn('[DEBUG] Failed line (last 100 chars):', trimmed.slice(-100));
          }
        }
      });

      child.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        console.log('[DEBUG] pty exited — code:', exitCode, 'signal:', signal);
        console.log('[DEBUG] Pending lineBuffer at exit:', JSON.stringify(lineBuffer));
        clearTimeout(hardTimeout);

        // Flush remaining buffer
        const remaining = lineBuffer.trim();
        if (remaining) {
          console.log('[DEBUG] Flushing remaining buffer, length:', remaining.length);
          try {
            handleMessage(JSON.parse(remaining));
          } catch (e) {
            console.warn('[DEBUG] Could not parse remaining buffer:', (e as Error).message);
            console.warn('[DEBUG] Buffer content:', remaining.slice(0, 500));
          }
        }

        if (!isClosed) send({ type: 'done', conversation_id: conversationId });
        safeClose();
      });

      function handleMessage(msg: any) {
        console.log('[DEBUG] handleMessage type:', msg.type, 'subtype:', msg.subtype ?? '-');

        switch (msg.type) {
          case 'system':
            if (msg.subtype === 'init' && msg.session_id) {
              send({ type: 'session_init', session_id: msg.session_id });
            }
            break;

          case 'reasoning': {
            const thinking = (msg.message?.content ?? [])
              .filter((c: any) => c.type === 'thinking')
              .map((c: any) => c.thinking)
              .join('');
            if (thinking) send({ type: 'thinking', content: thinking });
            break;
          }

          case 'assistant': {
            if (!msg.message) break;
            for (const c of msg.message.content ?? []) {
              if (c.type === 'thinking') send({ type: 'thinking', content: c.thinking });
              if (c.type === 'text' && c.text.trim() !== '') send({ type: 'text', content: c.text });
              if (c.type === 'tool_use')
                send({ type: 'tool_use', name: c.name, id: c.id, input: c.input });
            }
            break;
          }

          case 'ask_user_question':
            send({
              type: 'ask_user_question',
              question: msg.question ?? '',
              session_id: msg.session_id,
            });
            break;

          case 'result':
            clearTimeout(hardTimeout);
            send({ type: 'done', conversation_id: conversationId });
            safeClose();
            child.kill();
            break;

          default:
            console.log('[DEBUG] Unhandled message type:', msg.type);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
