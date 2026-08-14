import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth';

const GH_STATE_COOKIE = 'gh_state';

export async function GET(request: Request) {
  const sessionToken = (await cookies()).get(COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ detail: 'GitHub OAuth is not configured.' }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/github/callback`;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:org repo');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  });
  return response;
}
