export const dynamic = 'force-dynamic';

import { fetchChannels } from '@/hooks/channels';
import { ChannelsClient } from '@/components/studio/channels/ChannelsClient';

export default async function ChannelsPage() {
  const channels = await fetchChannels();
  return <ChannelsClient initialChannels={channels} />;
}
