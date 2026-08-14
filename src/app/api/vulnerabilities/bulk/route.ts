import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function PATCH(request: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.ids) || !body?.status) {
    return NextResponse.json({ detail: 'Missing ids or status.' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/vulnerabilities/bulk/update`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: body.ids, status: body.status }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => null);
    return NextResponse.json(data ?? { detail: 'Bulk update failed.' }, { status: backendRes.status });
  }
  return new NextResponse(null, { status: 204 });
}
