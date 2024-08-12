import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { Database } from './types/supabase';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

if (supabase) {
  console.log('Supabase client created successfully');
}

export default supabase;
