'use client';

import { useSession } from 'next-auth/react';

// visitor = ดู/โหลดเท่านั้น; user/admin = บันทึกได้ (server เป็นตัวบังคับจริง อันนี้แค่ UX)
export function useCanWrite() {
  const { data } = useSession();
  return ['user', 'admin'].includes(data?.user?.role);
}
