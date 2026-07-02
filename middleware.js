import { withAuth } from 'next-auth/middleware';

// บังคับ login ทุกหน้า (ยกเว้น /login, /api, static) — visitor ก็ต้องล็อกอินก่อน
export default withAuth({ pages: { signIn: '/login' } });

export const config = {
  matcher: [
    '/',
    '/session/:path*',
    '/form/:path*',
    '/inspect/:path*',
    '/meter/:path*',
    '/building-meter/:path*',
    '/report/:path*',
    '/admin/:path*',
  ],
};
