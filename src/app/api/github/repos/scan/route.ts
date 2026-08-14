import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.repository_id) {
    return NextResponse.json({ detail: 'Missing repository_id.' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/github/repos/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository_id: body.repository_id,
        branch: body.branch ?? null,
        workflow_id: body.workflow_id ?? null,
        workflow_path: body.workflow_path ?? null,
      }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to trigger scan.' }, { status: backendRes.status });
  }
  return NextResponse.json(data, { status: 202 });
}
