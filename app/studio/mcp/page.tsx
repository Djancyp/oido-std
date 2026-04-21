export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'MCP Servers' };

import { fetchMcpServers } from '@/hooks/mcp';
import { McpClient } from '@/components/studio/mcp/McpClient';

export default async function McpPage() {
  const servers = await fetchMcpServers();
  return <McpClient initialServers={servers} />;
}
