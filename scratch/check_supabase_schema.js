import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  console.log("Checking for 'teams' table...");
  const { data, error } = await supabase.from('teams').select('id').limit(1);
  if (error) {
    console.error("Error accessing 'teams' table:", error.message);
    if (error.message.includes("could not find table")) {
      console.log("CONFIRMED: Table 'teams' is missing from schema cache.");
    }
  } else {
    console.log("SUCCESS: 'teams' table is accessible.");
  }

  console.log("\nChecking for 'profiles' table...");
  const { data: pData, error: pError } = await supabase.from('profiles').select('id').limit(1);
  if (pError) {
    console.error("Error accessing 'profiles' table:", pError.message);
  } else {
    console.log("SUCCESS: 'profiles' table is accessible.");
  }
}

checkSchema();
