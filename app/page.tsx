export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Sign In' };

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AuthPage } from '@/components/auth/AuthPage';

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/studio');

  const hasUsers = (await prisma.user.count()) > 0;
  return <AuthPage hasUsers={hasUsers} />;
}
