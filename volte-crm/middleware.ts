import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // Lê a senha da variável de ambiente, sem fallback hardcoded
    const validPassword = process.env.ADMIN_PIN;
    
    if (user === 'volte' && pwd === validPassword) {
      return NextResponse.next();
    }
  }
  
  url.pathname = '/api/auth';
  return new NextResponse('Autenticação necessária', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ['/', '/api/((?!auth).*)'],
};