import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

export function middleware(request: NextRequest) {
  // Allow static assets and health checks
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname === '/health'
  ) {
    return NextResponse.next();
  }

  // Check for API key in header
  const apiKey = request.headers.get('x-api-key');

  if (!ADMIN_API_KEY) {
    // No admin key configured - deny all
    return new NextResponse('Admin API key not configured', { status: 500 });
  }

  if (apiKey !== ADMIN_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - health (health check endpoint)
     */
    '/((?!_next/static|_next/image|favicon.ico|health).*)',
  ],
};