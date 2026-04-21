export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Extensions' };

import { fetchExtensions } from '@/hooks/extensions';
import { ExtensionsClient } from '@/components/studio/extensions/ExtensionsClient';

export default async function ExtensionsPage() {
  const extensions = await fetchExtensions();
  return <ExtensionsClient initialExtensions={extensions} />;
}
