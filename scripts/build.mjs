#!/usr/bin/env node
// Merges the hand written narrative in data/projects.json with live signals
// (GitHub repo activity, whether each URL answers) into data/state.json.
// Runs locally with `npm run build` and daily in CI. Never edit state.json by hand.

import { readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const SRC = new URL('data/projects.json', ROOT);
const OUT = new URL('data/state.json', ROOT);

const token = process.env.GITHUB_TOKEN || '';
const gh = (path) =>
  fetch(`https://api.github.com/${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'mission-control',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

// A private repo returns 404 to an unauthorised caller. That is not an error,
// it just means we cannot read its activity from here.
async function repoSignals(repo) {
  if (!repo) return null;
  try {
    const res = await gh(`repos/${repo}`);
    if (res.status === 404) return { visible: false };
    if (!res.ok) return { visible: false, error: `HTTP ${res.status}` };
    const j = await res.json();

    let commits = null;
    const cres = await gh(`repos/${repo}/commits?per_page=1`);
    if (cres.ok) {
      // The commit count lives in the Link header's last page number.
      const link = cres.headers.get('link') || '';
      const m = link.match(/[?&]page=(\d+)>; rel="last"/);
      commits = m ? Number(m[1]) : (await cres.json()).length;
    }

    return {
      visible: true,
      private: j.private,
      pushedAt: j.pushed_at,
      commits,
      openIssues: j.open_issues_count,
      hasPages: j.has_pages,
      defaultBranch: j.default_branch,
    };
  } catch (e) {
    return { visible: false, error: String(e.message || e) };
  }
}

async function urlStatus(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'mission-control' },
    });
    return { code: res.status, up: res.ok };
  } catch (e) {
    return { code: null, up: false, error: String(e.message || e) };
  }
}

const daysSince = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

const src = JSON.parse(await readFile(SRC, 'utf8'));

const projects = await Promise.all(
  src.projects.map(async (p) => {
    const [repo, site] = await Promise.all([repoSignals(p.repo), urlStatus(p.url)]);
    const lastActivity = repo?.pushedAt || null;
    return {
      ...p,
      signals: {
        repo,
        site,
        lastActivity,
        idleDays: daysSince(lastActivity),
        // Progress is the share of known work that is behind us, not a guess.
        progress: Math.round(
          (p.done.length / Math.max(1, p.done.length + p.next.length)) * 100
        ),
      },
    };
  })
);

const state = {
  generatedAt: new Date().toISOString(),
  owner: src.owner,
  stages: src.stages,
  summary: {
    total: projects.length,
    live: projects.filter((p) => p.stage === 'live').length,
    earning: projects.filter((p) => p.stage === 'earning').length,
    blocked: projects.filter((p) => p.blocker).length,
    needsAjit: projects.filter((p) => p.needsAjit).length,
  },
  projects,
};

await writeFile(OUT, JSON.stringify(state, null, 2) + '\n');
console.log(
  `state.json written: ${projects.length} projects, ` +
    `${state.summary.blocked} blocked, ${state.summary.needsAjit} waiting on you`
);
