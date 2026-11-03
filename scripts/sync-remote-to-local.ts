import { createClient } from '@libsql/client';
import postgres from 'postgres';

const REMOTE_URL = process.env.SYNC_REMOTE_DATABASE_URL;

function toMs(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function toBoolInt(val: any): number {
  return val ? 1 : 0;
}

function toStr(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toNullableStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

async function sync() {
  if (!REMOTE_URL) throw new Error('SYNC_REMOTE_DATABASE_URL is required');
  console.log('🔄 Connecting to remote database...');
  const sql = postgres(REMOTE_URL, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 10,
    max: 2,
  });

  const local = createClient({ url: 'file:data/local.db' });

  // Disable foreign keys temporarily during batch import
  await local.execute('PRAGMA foreign_keys = OFF;');

  try {
    // 1. User
    console.log('\n👤 Syncing user table (adapted)...');
    const remoteUsers = await sql`SELECT * FROM "user"`;
    let userCount = 0;
    for (const u of remoteUsers) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO "user" 
              (id, name, email, email_verified, image, created_at, updated_at, utm_source, ip, locale)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          u.id,
          toStr(u.name, 'Anonymous'),
          u.email,
          toBoolInt(u.email_verified),
          toNullableStr(u.image),
          toMs(u.created_at) ?? Date.now(),
          toMs(u.updated_at) ?? Date.now(),
          toStr(u.utm_source, ''),
          toStr(u.ip, ''),
          toStr(u.locale, 'en'),
        ],
      });
      userCount++;
    }
    console.log(`  ✓ Synced ${userCount} users`);

    // 2. Account (password & credentials)
    console.log('\n🔑 Syncing account table...');
    const remoteAccounts = await sql`SELECT * FROM account`;
    let accountCount = 0;
    for (const a of remoteAccounts) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO account 
              (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, 
               access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          a.id,
          a.account_id,
          a.provider_id,
          a.user_id,
          toNullableStr(a.access_token),
          toNullableStr(a.refresh_token),
          toNullableStr(a.id_token),
          toMs(a.access_token_expires_at),
          toMs(a.refresh_token_expires_at),
          toNullableStr(a.scope),
          toNullableStr(a.password),
          toMs(a.created_at) ?? Date.now(),
          toMs(a.updated_at) ?? Date.now(),
        ],
      });
      accountCount++;
    }
    console.log(`  ✓ Synced ${accountCount} accounts`);

    // 3. Session
    console.log('\n🎫 Syncing session table...');
    const remoteSessions = await sql`SELECT * FROM session`;
    let sessionCount = 0;
    for (const s of remoteSessions) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO session 
              (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.id,
          toMs(s.expires_at) ?? Date.now(),
          s.token,
          toMs(s.created_at) ?? Date.now(),
          toMs(s.updated_at) ?? Date.now(),
          toNullableStr(s.ip_address),
          toNullableStr(s.user_agent),
          s.user_id,
        ],
      });
      sessionCount++;
    }
    console.log(`  ✓ Synced ${sessionCount} sessions`);

    // 4. Role
    console.log('\n🛡️  Syncing role table...');
    const remoteRoles = await sql`SELECT * FROM role`;
    let roleCount = 0;
    for (const r of remoteRoles) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO role 
              (id, name, title, description, status, created_at, updated_at, sort)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.id,
          r.name,
          toNullableStr(r.title),
          toNullableStr(r.description),
          toStr(r.status, 'active'),
          toMs(r.created_at) ?? Date.now(),
          toMs(r.updated_at) ?? Date.now(),
          r.sort ?? 0,
        ],
      });
      roleCount++;
    }
    console.log(`  ✓ Synced ${roleCount} roles`);

    // 5. Permission
    console.log('\n🔐 Syncing permission table...');
    const remotePermissions = await sql`SELECT * FROM permission`;
    let permCount = 0;
    for (const p of remotePermissions) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO permission 
              (id, code, resource, action, title, description, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          p.code,
          p.resource,
          p.action,
          toNullableStr(p.title),
          toNullableStr(p.description),
          toMs(p.created_at) ?? Date.now(),
          toMs(p.updated_at) ?? Date.now(),
        ],
      });
      permCount++;
    }
    console.log(`  ✓ Synced ${permCount} permissions`);

    // 6. Role Permission
    console.log('\n🔗 Syncing role_permission table...');
    const remoteRolePerms = await sql`SELECT * FROM role_permission`;
    let rpCount = 0;
    for (const rp of remoteRolePerms) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO role_permission 
              (id, role_id, permission_id, created_at, updated_at, deleted_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          rp.id,
          rp.role_id,
          rp.permission_id,
          toMs(rp.created_at) ?? Date.now(),
          toMs(rp.updated_at) ?? Date.now(),
          toMs(rp.deleted_at),
        ],
      });
      rpCount++;
    }
    console.log(`  ✓ Synced ${rpCount} role_permissions`);

    // 7. User Role
    console.log('\n👥 Syncing user_role table...');
    const remoteUserRoles = await sql`SELECT * FROM user_role`;
    let urCount = 0;
    for (const ur of remoteUserRoles) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO user_role 
              (id, user_id, role_id, created_at, updated_at, expires_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          ur.id,
          ur.user_id,
          ur.role_id,
          toMs(ur.created_at) ?? Date.now(),
          toMs(ur.updated_at) ?? Date.now(),
          toMs(ur.expires_at),
        ],
      });
      urCount++;
    }
    console.log(`  ✓ Synced ${urCount} user_roles`);

    // 8. Config
    console.log('\n⚙️  Syncing config table...');
    const remoteConfigs = await sql`SELECT * FROM config`;
    let configCount = 0;
    for (const c of remoteConfigs) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)`,
        args: [c.name, toStr(c.value)],
      });
      configCount++;
    }
    console.log(`  ✓ Synced ${configCount} configs`);

    // 9. Prompt
    console.log('\n💡 Syncing prompt table...');
    const remotePrompts = await sql`SELECT * FROM prompt`;
    let promptCount = 0;
    for (const p of remotePrompts) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO prompt 
              (id, user_id, title, description, image, prompt_title, prompt_description, 
               status, created_at, updated_at, sort, type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          toNullableStr(p.user_id),
          p.title,
          toNullableStr(p.description),
          p.image,
          toNullableStr(p.prompt_title),
          toNullableStr(p.prompt_description),
          toStr(p.status, 'published'),
          toMs(p.created_at) ?? Date.now(),
          toMs(p.updated_at) ?? Date.now(),
          p.sort ?? 0,
          toStr(p.type, 'image'),
        ],
      });
      promptCount++;
    }
    console.log(`  ✓ Synced ${promptCount} prompts`);

    // 10. Showcase
    console.log('\n🖼️  Syncing showcase table...');
    const remoteShowcases = await sql`SELECT * FROM showcase`;
    let showcaseCount = 0;
    for (const sc of remoteShowcases) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO showcase 
              (id, user_id, title, prompt, image, video_url, tags, description, type, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sc.id,
          toNullableStr(sc.user_id),
          sc.title,
          toNullableStr(sc.prompt),
          sc.image,
          toNullableStr(sc.video_url),
          toNullableStr(sc.tags),
          toNullableStr(sc.description),
          toStr(sc.type, 'image'),
          toMs(sc.created_at) ?? Date.now(),
        ],
      });
      showcaseCount++;
    }
    console.log(`  ✓ Synced ${showcaseCount} showcases`);

    // 11. Video
    console.log('\n🎬 Syncing video table...');
    const remoteVideos = await sql`SELECT * FROM video`;
    let videoCount = 0;
    for (const v of remoteVideos) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO video 
              (id, user_id, prompt, model, parameters, status, original_video_url, video_url, 
               start_image_url, first_frame_image_url, file_size, duration, resolution, 
               replicate_prediction_id, generation_time, credits_used, is_deleted, 
               created_at, updated_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          v.id,
          v.user_id,
          v.prompt,
          v.model,
          toStr(v.parameters, '{}'),
          toStr(v.status, 'completed'),
          toNullableStr(v.original_video_url),
          toNullableStr(v.video_url),
          toNullableStr(v.start_image_url),
          toNullableStr(v.first_frame_image_url),
          v.file_size ?? null,
          toNullableStr(v.duration),
          toNullableStr(v.resolution),
          toNullableStr(v.replicate_prediction_id),
          v.generation_time ?? null,
          v.credits_used ?? 0,
          v.is_deleted ?? 0,
          toMs(v.created_at) ?? Date.now(),
          toMs(v.updated_at) ?? Date.now(),
          toMs(v.completed_at),
        ],
      });
      videoCount++;
    }
    console.log(`  ✓ Synced ${videoCount} videos`);

    // 12. Credit
    console.log('\n💳 Syncing credit table...');
    const remoteCredits = await sql`SELECT * FROM credit`;
    let creditCount = 0;
    for (const cr of remoteCredits) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO credit 
              (id, user_id, user_email, order_no, subscription_no, transaction_no, 
               transaction_type, transaction_scene, credits, remaining_credits, description, 
               expires_at, status, created_at, updated_at, deleted_at, consumed_detail, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          cr.id,
          cr.user_id,
          toNullableStr(cr.user_email),
          toNullableStr(cr.order_no),
          toNullableStr(cr.subscription_no),
          toNullableStr(cr.transaction_no),
          toStr(cr.transaction_type, 'grant'),
          toNullableStr(cr.transaction_scene),
          cr.credits ?? 0,
          cr.remaining_credits ?? 0,
          toNullableStr(cr.description),
          toMs(cr.expires_at),
          toStr(cr.status, 'active'),
          toMs(cr.created_at) ?? Date.now(),
          toMs(cr.updated_at) ?? Date.now(),
          toMs(cr.deleted_at),
          toNullableStr(cr.consumed_detail),
          toNullableStr(cr.metadata),
        ],
      });
      creditCount++;
    }
    console.log(`  ✓ Synced ${creditCount} credit records`);

    // 13. AI Task
    console.log('\n🤖 Syncing ai_task table...');
    const remoteAiTasks = await sql`SELECT * FROM ai_task`;
    let aiTaskCount = 0;
    for (const task of remoteAiTasks) {
      await local.execute({
        sql: `INSERT OR REPLACE INTO ai_task 
              (id, user_id, media_type, provider, model, prompt, options, status, 
               created_at, updated_at, deleted_at, task_id, task_info, task_result, 
               cost_credits, scene, credit_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          task.id,
          task.user_id,
          toStr(task.media_type, 'image'),
          toStr(task.provider, 'system'),
          toStr(task.model, ''),
          toNullableStr(task.prompt),
          toNullableStr(task.options),
          toStr(task.status, 'pending'),
          toMs(task.created_at) ?? Date.now(),
          toMs(task.updated_at) ?? Date.now(),
          toMs(task.deleted_at),
          toNullableStr(task.task_id),
          toNullableStr(task.task_info),
          toNullableStr(task.task_result),
          task.cost_credits ?? 0,
          toNullableStr(task.scene),
          toNullableStr(task.credit_id),
        ],
      });
      aiTaskCount++;
    }
    console.log(`  ✓ Synced ${aiTaskCount} ai_tasks`);

    console.log('\n🎉 ALL TABLES SYNCED SUCCESSFULLY!');
  } finally {
    // Re-enable foreign keys
    await local.execute('PRAGMA foreign_keys = ON;');
    await sql.end();
    local.close();
  }
}

sync().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
