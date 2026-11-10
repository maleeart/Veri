import { NextResponse } from 'next/server';
import { 
  saveRepairProposal, 
  listRepairProposals, 
  loadRepairProposalByRef, 
  deleteRepairProposal 
} from '../../../src/lib/githubStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const refNo = searchParams.get('refNo');

    if (refNo) {
      const proposal = await loadRepairProposalByRef(refNo);
      if (!proposal) {
        return NextResponse.json({ error: 'ไม่พบใบเสนอแจ้งซ่อม' }, { status: 404 });
      }
      return NextResponse.json(proposal);
    }

    const proposals = await listRepairProposals();
    return NextResponse.json({ ok: true, proposals });
  } catch (err) {
    console.error('repair-proposals GET error:', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err), proposals: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.refNo) {
      return NextResponse.json({ error: 'ต้องระบุเลขที่ใบเสนอซ่อม (refNo)' }, { status: 400 });
    }

    const result = await saveRepairProposal(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('repair-proposals POST error:', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const refNo = searchParams.get('refNo');
    if (!refNo) {
      return NextResponse.json({ error: 'ต้องระบุ refNo' }, { status: 400 });
    }

    const result = await deleteRepairProposal(refNo);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('repair-proposals DELETE error:', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
