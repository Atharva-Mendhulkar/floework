import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Assuming we run this from apps/web or root
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tasks, error } = await supabase.from('tasks').select('id, title, project_id').limit(20);
  if (error || !tasks) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Found ${tasks.length} tasks`);
  if (tasks.length < 2) return;

  // Let's create some logical dependencies:
  // We'll create a linear chain of 3 tasks, and maybe one branching.
  const dependencies = [];
  
  // Find specific tasks by title if possible, or just link first few
  const t1 = tasks[0];
  const t2 = tasks[1];
  const t3 = tasks[2];
  const t4 = tasks[3];

  if (t1 && t2) dependencies.push({ source_task_id: t1.id, target_task_id: t2.id, relationship_type: 'blocks' });
  if (t2 && t3) dependencies.push({ source_task_id: t2.id, target_task_id: t3.id, relationship_type: 'depends_on' });
  if (t1 && t4) dependencies.push({ source_task_id: t1.id, target_task_id: t4.id, relationship_type: 'relates_to' });

  for (const dep of dependencies) {
    const { error: insErr } = await supabase.from('task_dependencies').insert(dep);
    if (insErr) {
      console.log(`Error inserting ${dep.source_task_id} -> ${dep.target_task_id}:`, insErr.message);
    } else {
      console.log(`Inserted dependency ${dep.source_task_id} -> ${dep.target_task_id}`);
    }
  }
}

run();
