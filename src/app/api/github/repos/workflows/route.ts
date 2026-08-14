import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const repositoryId = url.searchParams.get('repository_id');
  const branch = url.searchParams.get('branch');
  if (!repositoryId) {
    return NextResponse.json({ detail: 'Missing repository_id.' }, { status: 400 });
  }

  const params = new URLSearchParams({ repository_id: repositoryId });
  if (branch) params.set('branch', branch);

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/github/repos/workflows?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to fetch workflows.' }, { status: backendRes.status });
  }
  return NextResponse.json(data);
}
