import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'aram_draft_pick' },
  auth: {
    persistSession: false
  }
});

if (supabase) {
  console.log('Supabase client created successfully');
}

export default supabase;
