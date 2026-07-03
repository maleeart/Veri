import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE   = 'https://api.github.com';
const BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  return { token, owner, repo };
}

export async function GET() {
  const gate = await requireRole('admin');
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { token, owner, repo } = cfg();
  const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

  // ดึง HEAD commit
  const refRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`, { cache: 'no-store', headers: hdrs });
  if (!refRes.ok) return NextResponse.json({ error: `ref failed ${refRes.status}` }, { status: 500 });
  const { object: { sha: commitSha } } = await refRes.json();

  // ดึง tree recursive
  const treeRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, { cache: 'no-store', headers: hdrs });
  if (!treeRes.ok) return NextResponse.json({ error: `tree failed ${treeRes.status}` }, { status: 500 });
  const { tree, truncated } = await treeRes.json();

  const inspections = (tree || [])
    .filter(i => i.type === 'blob' && i.path.startsWith('data/inspections/') && i.path.endsWith('.json'))
    .map(i => ({ path: i.path, sha: i.sha, size: i.size }));

  const deleteReqs = (tree || [])
    .filter(i => i.type === 'blob' && i.path.startsWith('data/delete-requests/'))
    .map(i => ({ path: i.path, sha: i.sha }));

  const editLogs = (tree || [])
    .filter(i => i.type === 'blob' && i.path.startsWith('data/edit-logs/'))
    .map(i => ({ path: i.path, sha: i.sha }));

  return NextResponse.json({ commitSha, truncated, inspections, deleteReqs, editLogs });
}
