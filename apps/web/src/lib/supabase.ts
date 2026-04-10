import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Graceful fallback — app will load but Supabase calls will fail silently
if (!supabaseUrl || !supabaseKey) {
  console.warn('[floework] Supabase env vars not set. DB features disabled in this build.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
