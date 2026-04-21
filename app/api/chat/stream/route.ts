import { NextRequest } from 'next/server';
import { waiters } from '@/lib/waiters';

export const runtime = 'nodejs';

type ChatRequest = {
  message: string;
  agentId?: string;
  tabId?: string;
  model?: string;
  systemPrompt?: string;
  excludeTools?: string[];
  conversationId?: number;
  sessionId?: string;
  continue?: boolean;
  approvalMode?: 'yolo' | 'auto-edit' | 'plan';
};

const IDLE_TIMEOUT_MS = 120_000;

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();

  if (!body.message) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }
  const pty = await import('node-pty');
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

      if (!body.model) body.model = 'openrouter/free';
      args.push('-m', body.model);
      if (body.systemPrompt) args.push('--system-prompt', body.systemPrompt);
      if (body.excludeTools?.length) {
        for (const tool of body.excludeTools) args.push('--no-tool', tool);
      }
      console.log('[DEBUG][ARGS] ', args);

      const child = pty.spawn('/home/djan/Documents/codding/agent-cli/oido-cli/oido', args, {
        name: 'xterm-256color',
        cols: 10000,
        rows: 50,
        env: {
          ...(process.env as Record<string, string>),
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      });

      let idleTimer: ReturnType<typeof setTimeout>;

      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          console.warn(`[stream] idle for ${IDLE_TIMEOUT_MS}ms — killing`);
          send({ type: 'error', message: `No activity for ${IDLE_TIMEOUT_MS / 1000}s` });
          safeClose();
          child.kill();
        }, IDLE_TIMEOUT_MS);
      };

      resetIdleTimer();

      const pendingToolCalls = new Map<string, { name: string; input: any }>();
      let lineBuffer = '';

      async function handleMessage(msg: any) {
        switch (msg.type) {
          case 'system':
            if (msg.subtype === 'init') {
              send({
                type: 'session_init',
                session_id: msg.session_id,
                agents: msg.agents ?? [],
                tools: msg.tools ?? [],
                model: msg.model,
                permission_mode: msg.permission_mode,
              });
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
            const content: any[] = msg.message.content ?? [];

            // Flush completed tool calls (skip ask_user_question — handled separately)
            if (pendingToolCalls.size > 0) {
              for (const [id, { name }] of pendingToolCalls) {
                if (name !== 'ask_user_question') {
                  send({ type: 'tool_result', id, name });
                }
              }
              pendingToolCalls.clear();
            }

            for (const c of content) {
              if (c.type === 'thinking' && c.thinking) {
                send({ type: 'thinking', content: c.thinking });
              }
              if (c.type === 'text' && c.text?.trim()) {
                send({ type: 'text', content: c.text });
              }
              if (c.type === 'tool_use') {
                pendingToolCalls.set(c.id, { name: c.name, input: c.input });
                if (c.name !== 'ask_user_question') {
                  send({ type: 'tool_use', id: c.id, name: c.name, input: c.input });
                }
              }
            }
            break;
          }

          case 'ask_user_question': {
            // Priority order for question text:
            // 1. msg.message.content[].type === 'question'  (richest, has header + options)
            // 2. pending tool call input.question           (fallback)
            // 3. msg.question                               (legacy fallback)
            const questionBlock = (msg.message?.content ?? []).find(
              (c: any) => c.type === 'question'
            );

            let question = questionBlock?.question ?? '';
            let header = questionBlock?.header ?? '';
            let options: string[] | null = questionBlock?.options ?? null;

            // Fallback to tool input if message block had no text
            if (!question) {
              for (const [, { name, input }] of pendingToolCalls) {
                if (name === 'ask_user_question' && input?.question) {
                  question = input.question;
                  break;
                }
              }
            }

            // Last resort fallback
            if (!question) question = msg.question ?? '';

            send({
              type: 'ask_user_question',
              question,
              header,
              options, // null = free text; string[] = multiple choice
              session_id: msg.session_id,
            });

            clearTimeout(idleTimer);

            const answer = await new Promise<string>((resolve, reject) => {
              waiters.set(conversationId, { resolve, reject });
              setTimeout(
                () => {
                  if (waiters.has(conversationId)) {
                    waiters.delete(conversationId);
                    reject('question timed out');
                  }
                },
                5 * 60 * 1000
              );
            }).catch(reason => {
              send({ type: 'error', message: String(reason) });
              safeClose();
              child.kill();
              return null;
            });

            if (answer !== null) {
              child.write(answer + '\n');
              resetIdleTimer();
            }
            break;
          }

          case 'result':
            for (const [id, { name }] of pendingToolCalls) {
              if (name !== 'ask_user_question') {
                send({ type: 'tool_result', id, name });
              }
            }
            pendingToolCalls.clear();
            clearTimeout(idleTimer);
            send({
              type: 'done',
              conversation_id: conversationId,
              is_error: msg.is_error ?? false,
              num_turns: msg.num_turns ?? 0,
              duration_ms: msg.duration_ms ?? 0,
            });
            safeClose();
            child.kill();
            break;

          default:
            console.log('[stream] unhandled type:', msg.type);
        }
      }

      child.onData((raw: string) => {
        resetIdleTimer();

        const cleaned = raw
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1B\][^\x07]*(\x07|\x1B\\)/g, '')
          .replace(/\x1B[@-Z\\-_]/g, '')
          .replace(/\x1B\[[\x00-\x7F]*?[A-Za-z]/g, '');

        lineBuffer += cleaned;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        (async () => {
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              await handleMessage(JSON.parse(trimmed));
            } catch (e) {
              console.warn(
                '[stream] parse fail:',
                (e as Error).message,
                '|',
                trimmed.slice(0, 200)
              );
            }
          }
        })();
      });

      child.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        clearTimeout(idleTimer);
        const remaining = lineBuffer.trim();
        if (remaining) {
          try {
            handleMessage(JSON.parse(remaining));
          } catch {}
        }
        if (!isClosed) send({ type: 'done', conversation_id: conversationId });
        safeClose();
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
}
