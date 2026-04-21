import { NextRequest, NextResponse } from 'next/server';
import { unlinkSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export const runtime = 'nodejs';

type SessionsTabsRequest = {
  agentId: string;
  tabId: string;
};

export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    const tabId = url.searchParams.get('tabId');

    if (!agentId || !tabId) {
      return new Response(
        JSON.stringify({ error: 'Both agentId and tabId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Capture these values for use in error handling
    const currentAgentId = agentId;
    const currentTabId = tabId;

    // Build command to execute oido sessions tabs
    const args = ['sessions', 'tabs', '--agent-id', agentId, '--tab-id', tabId];
    const oidoPath = process.env.OIDO_PATH || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';

    // Execute the command
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(`${oidoPath} ${args.join(' ')}`);

    if (stderr) {
      console.error('Error from oido command:', stderr);
      return new Response(
        JSON.stringify({ error: 'Error retrieving session tabs', details: stderr }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle case where no sessions exist for the tab
    if (stdout.trim().startsWith('No session') || stdout.trim() === '') {
      return new Response(
        JSON.stringify({
          agentId: currentAgentId,
          tabId: currentTabId,
          sessionCount: 0,
          entryCount: 0,
          conversation: [],
          sessions: []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and return the response
    const sessionData = JSON.parse(stdout);

    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sessions/tabs:', error);
    // Handle case where stdout is not valid JSON
    if (error.message.includes('Unexpected token') && error.message.includes('is not valid JSON')) {
      // Get the agentId and tabId from the URL in the error case
      const url = new URL(req.url);
      const agentId = url.searchParams.get('agentId');
      const tabId = url.searchParams.get('tabId');
      
      return new Response(
        JSON.stringify({
          agentId: agentId || 'unknown',
          tabId: tabId || 'unknown',
          sessionCount: 0,
          entryCount: 0,
          conversation: [],
          sessions: [],
          message: 'No sessions found for this agent-tab combination'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to retrieve session tabs', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* DELETE: remove all sessions for a tab and update agent YAML */
export async function DELETE(req: NextRequest) {
  try {
    const { agentId, tabId, agentName } = await req.json() as {
      agentId: string;
      tabId: string;
      agentName: string;
    };

    if (!agentId || !tabId || !agentName) {
      return NextResponse.json({ error: 'agentId, tabId, and agentName are required' }, { status: 400 });
    }

    const oidoPath = process.env.OIDO_PATH || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Find session files belonging to this tab
    const { stdout } = await execAsync(`${oidoPath} sessions list --json`).catch(() => ({ stdout: '[]' }));
    const sessions: Array<{ tabId: string; path: string }> = JSON.parse(stdout.trim() || '[]');

    const { unlinkSync } = await import('fs');
    let deletedCount = 0;
    for (const s of sessions) {
      if (s.tabId === tabId && s.path) {
        try { unlinkSync(s.path); deletedCount++; } catch {}
      }
    }

    // Remove tabId from agent YAML (best-effort)
    try {
      const { readFileSync, writeFileSync } = await import('fs');
      const agentsDir = join(process.env.HOME ?? '/root', '.config', 'oido', 'agents');
      const raw = readFileSync(join(agentsDir, `${agentName}.yaml`), 'utf-8');
      const parsed = yaml.load(raw) as Record<string, unknown> & { tab_ids?: string[] };
      parsed.tab_ids = (parsed.tab_ids ?? []).filter((id: string) => id !== tabId);
      writeFileSync(join(agentsDir, `${agentName}.yaml`), yaml.dump(parsed), 'utf-8');
    } catch {}

    return NextResponse.json({ success: true, deletedSessions: deletedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, tabId }: SessionsTabsRequest = await req.json();

    if (!agentId || !tabId) {
      return new Response(
        JSON.stringify({ error: 'Both agentId and tabId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build command to execute oido sessions tabs
    const args = ['sessions', 'tabs', '--agent-id', agentId, '--tab-id', tabId];
    const oidoPath = process.env.OIDO_PATH || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';

    // Execute the command
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(`${oidoPath} ${args.join(' ')}`);

    if (stderr) {
      console.error('Error from oido command:', stderr);
      return new Response(
        JSON.stringify({ error: 'Error retrieving session tabs', details: stderr }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle case where no sessions exist for the tab
    if (stdout.trim().startsWith('No session') || stdout.trim() === '') {
      return new Response(
        JSON.stringify({
          agentId,
          tabId,
          sessionCount: 0,
          entryCount: 0,
          conversation: [],
          sessions: []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and return the response
    const sessionData = JSON.parse(stdout);

    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in POST /api/sessions/tabs:', error);
    // Handle case where stdout is not valid JSON
    if (error.message.includes('Unexpected token') && error.message.includes('is not valid JSON')) {
      // For this case, we can't access the original agentId and tabId in the catch block
      // since they're part of the request body parsing, so we'll use unknown values
      return new Response(
        JSON.stringify({
          agentId: 'unknown',  // We can't access the original value in catch block
          tabId: 'unknown',    // We can't access the original value in catch block
          sessionCount: 0,
          entryCount: 0,
          conversation: [],
          sessions: [],
          message: 'No sessions found for this agent-tab combination'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to retrieve session tabs', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}