import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs'; // REQUIRED for child_process + streams

type SessionsListRequest = {
  agentId?: string;
  tabId?: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    const tabId = url.searchParams.get('tabId');

    // Build command to execute oido sessions list
    const args: string[] = ['sessions', 'list', '--json'];

    if (agentId) {
      args.push('--agent-id', agentId);
    }

    if (tabId) {
      args.push('--tab-id', tabId);
    }

    const oidoPath =
      process.env.OIDO_PATH || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';

    // Execute the command
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(`${oidoPath} ${args.join(' ')}`);

    if (stderr) {
      console.error('Error from oido command:', stderr);
      return new Response(JSON.stringify({ error: 'Error retrieving sessions', details: stderr }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and return the response
    const sessions = JSON.parse(stdout);

    return new Response(JSON.stringify(sessions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sessions/list:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve sessions', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

