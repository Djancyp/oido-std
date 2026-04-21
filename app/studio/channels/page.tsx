export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Channels' };

import { fetchChannels } from '@/hooks/channels';
import { ChannelsClient } from '@/components/studio/channels/ChannelsClient';

export default async function ChannelsPage() {
  const channels = await fetchChannels();
  return <ChannelsClient initialChannels={channels} />;
}
