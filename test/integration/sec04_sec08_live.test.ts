/**
 * LIVE INTEGRATION TEST — hits your real Supabase project, not mocks.
 *
 * Proves (with two real authenticated tenants, not anonymous requests):
 *   SEC-04: An admin of Team A can read Team A's concurrency_conflicts rows,
 *           and CANNOT read Team B's rows (via base table + both views).
 *   SEC-08: An authenticated non-member is rejected from toggle_task_star,
 *           AND a legitimate member can still successfully star/unstar.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vlozimkyxyyigclfdntp.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_HQSrFIW7egbPp_KAKBTkBA_U0A7Pfo2';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set these as environment variables before running this integration test.'
  );
}

// Service-role client: ONLY for fixture setup/teardown. Never used to make
// the assertions the test is actually checking — that client bypasses RLS,
// so any assertion against it would be meaningless.
const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RUN_ID = randomUUID().slice(0, 8);
console.log(`[sec04_sec08_live] run id: ${RUN_ID} (search for this to find/clean up orphaned rows)`);

interface Tenant {
  userId: string;
  email: string;
  client: SupabaseClient; // authenticated AS this user — used for all real assertions
  teamId: string;
  projectId: string;
  taskId: string;
  conflictId: string;
}

/** Creates a real, immediately-confirmed auth user and returns a client signed in as them. */
async function createAuthedUser(label: string): Promise<{ client: SupabaseClient; userId: string; email: string }> {
  const email = `sec04-${label}-${RUN_ID}@example.com`;
  const password = 'Test-Password-123!';

  // Using admin.createUser with email_confirm so this works regardless of
  // the project's "confirm email" auth setting.
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error('createUser returned no user');

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { client, userId: created.user.id, email };
}

/** Builds one full tenant: user + team (as admin) + project + task + one fixture conflict row. */
async function setupTenant(label: 'a' | 'b'): Promise<Tenant> {
  const { client, userId, email } = await createAuthedUser(label);

  const { data: team, error: teamErr } = await svc
    .from('teams')
    .insert({
      name: `SEC04 Team ${label.toUpperCase()} ${RUN_ID}`,
      slug: `sec04-${label}-${RUN_ID}`,
      creator_id: userId,
    })
    .select()
    .single();
  if (teamErr) throw teamErr;

  const { error: memberErr } = await svc
    .from('team_members')
    .insert({ team_id: team.id, user_id: userId, role: 'admin' });
  if (memberErr) throw memberErr;

  const { data: project, error: projectErr } = await svc
    .from('projects')
    .insert({ team_id: team.id, name: `SEC04 Project ${label.toUpperCase()}` })
    .select()
    .single();
  if (projectErr) throw projectErr;

  const { data: task, error: taskErr } = await svc
    .from('tasks')
    .insert({ project_id: project.id, title: `SEC04 Task ${label.toUpperCase()}`, status: 'backlog', effort: 'S' })
    .select()
    .single();
  if (taskErr) throw taskErr;

  // Fixture conflict row, tagged with team_id exactly as the fixed PATCH
  // handler is expected to do. Inserted via service role since the app code
  // implementing this isn't deployed yet — this isolates the RLS/DB fix from
  // the API-layer fix.
  const { data: conflict, error: conflictErr } = await svc
    .from('concurrency_conflicts')
    .insert({
      entity_type: 'task',
      entity_id: task.id,
      client_version: 1,
      server_version: 2,
      user_id: userId,
      team_id: team.id,
    })
    .select()
    .single();
  if (conflictErr) throw conflictErr;

  return { userId, email, client, teamId: team.id, projectId: project.id, taskId: task.id, conflictId: conflict.id };
}

/** Best-effort teardown for one tenant: every step wrapped so one failure doesn't skip the rest. */
async function teardownTenant(t: Tenant | undefined) {
  if (!t) return;
  const steps: Array<() => Promise<unknown>> = [
    () => svc.from('concurrency_conflicts').delete().eq('id', t.conflictId),
    () => svc.from('starred_tasks').delete().eq('task_id', t.taskId),
    () => svc.from('tasks').delete().eq('id', t.taskId),
    () => svc.from('projects').delete().eq('id', t.projectId),
    () => svc.from('team_members').delete().eq('team_id', t.teamId),
    () => svc.from('teams').delete().eq('id', t.teamId),
    () => svc.auth.admin.deleteUser(t.userId),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch (e) {
      console.warn(`[sec04_sec08_live] teardown step failed for run ${RUN_ID}:`, e);
    }
  }
}

let tenantA: Tenant;
let tenantB: Tenant;

beforeAll(async () => {
  tenantA = await setupTenant('a');
  tenantB = await setupTenant('b');
}, 30_000);

afterAll(async () => {
  await teardownTenant(tenantA);
  await teardownTenant(tenantB);
}, 30_000);

describe('SEC-04: concurrency_conflicts tenant isolation (live, authenticated)', () => {
  it("Team A admin sees Team A's own conflict row", async () => {
    const { data, error } = await tenantA.client.from('concurrency_conflicts').select('*').eq('id', tenantA.conflictId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].team_id).toBe(tenantA.teamId);
  });

  it("Team A admin does NOT see Team B's conflict row", async () => {
    const { data, error } = await tenantA.client.from('concurrency_conflicts').select('*').eq('id', tenantB.conflictId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("Team B admin sees Team B's own row and not Team A's", async () => {
    const { data: own } = await tenantB.client.from('concurrency_conflicts').select('*').eq('id', tenantB.conflictId);
    expect(own).toHaveLength(1);

    const { data: other } = await tenantB.client.from('concurrency_conflicts').select('*').eq('id', tenantA.conflictId);
    expect(other).toHaveLength(0);
  });

  it("conflict_stats does not surface Team B's data to Team A's admin", async () => {
    const { data, error } = await tenantA.client.from('conflict_stats').select('*');
    expect(error).toBeNull();
    expect(JSON.stringify(data)).not.toContain(tenantB.taskId);
  });

  it("conflict_hotspots does not surface Team B's data to Team A's admin", async () => {
    const { data, error } = await tenantA.client.from('conflict_hotspots').select('*');
    expect(error).toBeNull();
    expect(JSON.stringify(data)).not.toContain(tenantB.taskId);
    expect(JSON.stringify(data)).not.toContain(tenantB.userId);
  });
});

describe('Regression: non-admin member still sees nothing (pre-existing behavior)', () => {
  it('a non-admin member of Team A cannot read any conflicts', async () => {
    const { client: memberClient, userId: memberUserId } = await createAuthedUser('a-member');
    const { error: joinErr } = await svc
      .from('team_members')
      .insert({ team_id: tenantA.teamId, user_id: memberUserId, role: 'member' });
    expect(joinErr).toBeNull();

    try {
      const { data, error } = await memberClient.from('concurrency_conflicts').select('*');
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      try { await svc.from('team_members').delete().eq('user_id', memberUserId); } catch {}
      await svc.auth.admin.deleteUser(memberUserId).catch(() => {});
    }
  });
});

describe('SEC-08: toggle_task_star membership enforcement (live, authenticated)', () => {
  it("rejects a user who is not a member of the task's project", async () => {
    // Team B's admin attempts to star Team A's task.
    const { data, error } = await tenantB.client.rpc('toggle_task_star', { p_task_id: tenantA.taskId });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not a member of the project/i);
  });

  it('allows a legitimate project member to star and unstar their own task', async () => {
    const { data: first, error: firstErr } = await tenantA.client.rpc('toggle_task_star', {
      p_task_id: tenantA.taskId,
    });
    expect(firstErr).toBeNull();
    expect(first).toBe(true);

    const { data: second, error: secondErr } = await tenantA.client.rpc('toggle_task_star', {
      p_task_id: tenantA.taskId,
    });
    expect(secondErr).toBeNull();
    expect(second).toBe(false);
  });
});
