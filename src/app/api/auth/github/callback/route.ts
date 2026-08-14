import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, COOKIE_NAME } from '@/lib/auth';

const GH_STATE_COOKIE = 'gh_state';

function redirectTo(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(GH_STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  const expectedState = cookieStore.get(GH_STATE_COOKIE)?.value;

  if (!sessionToken || !code || !state || !expectedState || state !== expectedState) {
    return redirectTo(request, '/?github=error');
  }

  const redirectUri = `${url.origin}/api/auth/github/callback`;

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/github/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    if (!backendRes.ok) {
      return redirectTo(request, '/?github=error');
    }
  } catch {
    return redirectTo(request, '/?github=error');
  }

  return redirectTo(request, '/?github=connected');
}
