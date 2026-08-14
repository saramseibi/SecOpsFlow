import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_NAME, getJwtSecretKey } from '@/lib/auth';

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await isValidSession(token);

  if (!authenticated && pathname !== '/signup') {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  if (authenticated && pathname === '/signup') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/scans/:path*', '/vulnerabilities/:path*', '/settings/:path*', '/signup'],
};
