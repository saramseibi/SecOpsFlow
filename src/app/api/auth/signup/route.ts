import { NextResponse } from 'next/server';
import { BACKEND_URL, COOKIE_MAX_AGE_SECONDS, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid request body.' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server. Please try again.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Sign up failed.' }, { status: backendRes.status });
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
