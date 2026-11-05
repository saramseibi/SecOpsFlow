import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const regenerate = new URL(request.url).searchParams.get('regenerate') === 'true';

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${BACKEND_URL}/api/vulnerabilities/${encodeURIComponent(id)}/ai-analysis?regenerate=${regenerate}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok) {
    return NextResponse.json(data ?? { detail: 'Failed to generate AI analysis.' }, {
      status: backendRes.status,
    });
  }
  return NextResponse.json(data);
}
