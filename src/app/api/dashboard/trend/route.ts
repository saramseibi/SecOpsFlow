import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const days = new URL(request.url).searchParams.get('days') ?? '7';

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/dashboard/trend?days=${encodeURIComponent(days)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to fetch trend data.' }, { status: backendRes.status });
  }
  return NextResponse.json(data);
}
