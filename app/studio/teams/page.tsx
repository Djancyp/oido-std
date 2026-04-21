export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Teams' };

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TeamsClient } from '@/components/studio/teams/TeamsClient';

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const serializedUsers = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    roles: u.roles.map(r => ({ id: r.role.id, name: r.role.name })),
  }));

  const serializedRoles = roles.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
  }));

  return <TeamsClient initialUsers={serializedUsers} initialRoles={serializedRoles} />;
}
