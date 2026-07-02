import GoogleProvider from 'next-auth/providers/google';
import { getServerSession } from 'next-auth';
import { getRoleForEmail } from './usersStore';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    // ดึง role ครั้งเดียวตอน sign-in แล้วฝังใน JWT (เปลี่ยน role ต้อง login ใหม่)
    async jwt({ token, user }) {
      if (user) {
        const email = (user.email || '').toLowerCase();
        token.role = ADMIN_EMAILS.includes(email) ? 'admin' : await getRoleForEmail(email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role || 'visitor';
      return session;
    },
  },
};

const RANK = { visitor: 1, user: 2, admin: 3 };

/**
 * ตรวจสิทธิ์ใน API route (server-side = ขอบเขตความปลอดภัยจริง)
 * คืน { ok:true, session, role } หรือ { ok:false, status, error }
 */
export async function requireRole(min) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const role = session.user.role || 'visitor';
  if ((RANK[role] || 0) < (RANK[min] || 99))
    return { ok: false, status: 403, error: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้' };
  return { ok: true, session, role };
}
