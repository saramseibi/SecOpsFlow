import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/vulnerabilities/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to load vulnerability.' }, { status: backendRes.status });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.status) {
    return NextResponse.json({ detail: 'Missing status.' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/vulnerabilities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: body.status }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to update status.' }, { status: backendRes.status });
  }
  return NextResponse.json(data);
}
