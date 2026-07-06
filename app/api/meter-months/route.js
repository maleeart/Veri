import { NextResponse } from 'next/server';
import { listMeterMonths } from '../../../src/lib/meterStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const year = new URL(request.url).searchParams.get('year');
  if (!year) return NextResponse.json({ error: 'ต้องระบุ year' }, { status: 400 });
  try {
    const months = await listMeterMonths(year);
    return NextResponse.json({ months });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
