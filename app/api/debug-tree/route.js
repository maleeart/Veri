import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://api.github.com';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  return { token, owner, repo };
}

async function scanBranch(owner, repo, branch, hdrs) {
  const refRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { cache: 'no-store', headers: hdrs });
  if (!refRes.ok) return { exists: false };
  const { object: { sha: commitSha } } = await refRes.json();
  const treeRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, { cache: 'no-store', headers: hdrs });
  if (!treeRes.ok) return { exists: true, commitSha, error: `tree ${treeRes.status}` };
  const { tree, truncated } = await treeRes.json();
  return {
    exists: true, commitSha, truncated,
    inspections: (tree || []).filter(i => i.type === 'blob' && i.path.startsWith('data/inspections/')).map(i => i.path),
    deleteReqs:  (tree || []).filter(i => i.type === 'blob' && i.path.startsWith('data/delete-requests/')).map(i => i.path),
    editLogs:    (tree || []).filter(i => i.type === 'blob' && i.path.startsWith('data/edit-logs/')).map(i => i.path),
  };
}

export async function GET() {
  const gate = await requireRole('admin');
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { token, owner, repo } = cfg();
  const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

  const envBranch = process.env.GITHUB_REPO_BRANCH || '(not set → data)';

  const [dataBranch, mainBranch] = await Promise.all([
    scanBranch(owner, repo, 'data', hdrs),
    scanBranch(owner, repo, 'main', hdrs),
  ]);

  return NextResponse.json({ envBranch, data: dataBranch, main: mainBranch });
}
