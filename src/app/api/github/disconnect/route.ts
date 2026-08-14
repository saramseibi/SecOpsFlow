import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function DELETE() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/github/disconnect`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => null);
    return NextResponse.json(data ?? { detail: 'Failed to disconnect GitHub.' }, { status: backendRes.status });
  }
  return new NextResponse(null, { status: 204 });
}
