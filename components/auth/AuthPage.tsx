'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Mode = 'login' | 'register';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-destructive">{msg}</p>;
}

export function AuthPage({ hasUsers }: { hasUsers: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(hasUsers ? 'login' : 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Registered but login failed. Try logging in.');
        setMode('login');
        return;
      }
      router.push('/studio');
    } catch {
      setError('Unexpected error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Invalid email or password');
        return;
      }
      router.push('/studio');
    } catch {
      setError('Unexpected error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8 border rounded-xl shadow-sm bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-xl mb-2">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-2xl rounded-tr-none shadow-sm mr-1">
              O
            </span>
            ido Studio
          </h1>
          <h1 className="text-lg font-semibold">{isRegister ? 'Create account' : 'Sign in'}</h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? 'Set up your oido account.' : 'Welcome back.'}
          </p>
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="flex flex-col gap-4">
          {isRegister && (
            <Field label="Name">
              <Input
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email">
            <Input
              required
              type="email"
              autoFocus={!isRegister}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <Input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isRegister ? 'At least 8 characters' : 'Password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </Field>

          {error && <ErrorMsg msg={error} />}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? isRegister
                ? 'Creating...'
                : 'Signing in...'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </Button>
        </form>

        {hasUsers && (
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setError('');
                    setMode('login');
                  }}
                  className="text-foreground underline underline-offset-4"
                >
                  Sign in
                </button>
              </>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
