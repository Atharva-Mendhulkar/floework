// scripts/seed_edges.mjs
// ==============================================================================
// Seeds task dependency edges directly in Amazon RDS PostgreSQL
// ==============================================================================
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const connectionString = process.env.DATABASE_URL || 'postgresql://floework_admin:floework_secure_pass@localhost:5432/floework'
const pool = new pg.Pool({ connectionString })

async function run() {
  const client = await pool.connect()
  try {
    const res = await client.query('SELECT id, title, project_id FROM public.tasks LIMIT 20')
    const tasks = res.rows || []

    console.log(`Found ${tasks.length} tasks`)
    if (tasks.length < 2) {
      console.log('Not enough tasks to build dependency graph')
      return
    }

    const dependencies = []
    const t1 = tasks[0]
    const t2 = tasks[1]
    const t3 = tasks[2]
    const t4 = tasks[3]

    if (t1 && t2) dependencies.push({ source_task_id: t1.id, target_task_id: t2.id, relationship_type: 'blocks' })
    if (t2 && t3) dependencies.push({ source_task_id: t2.id, target_task_id: t3.id, relationship_type: 'depends_on' })
    if (t1 && t4) dependencies.push({ source_task_id: t1.id, target_task_id: t4.id, relationship_type: 'relates_to' })

    for (const dep of dependencies) {
      try {
        await client.query(
          `INSERT INTO public.task_dependencies (source_task_id, target_task_id, relationship_type)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [dep.source_task_id, dep.target_task_id, dep.relationship_type]
        )
        console.log(`Inserted dependency ${dep.source_task_id} -> ${dep.target_task_id}`)
      } catch (err) {
        console.log(`Error inserting ${dep.source_task_id} -> ${dep.target_task_id}:`, err.message)
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error('Fatal error seeding edges:', err)
  process.exit(1)
})
