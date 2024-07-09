import supabase from '../supabase';

export default async function supabaseQuery<T>(
  table: string,
  query: (q: any) => any,
  errorMessage: string
): Promise<T> { 
  try {
    const { data, error } = await query(supabase.from(table));
    if (error) throw new Error(`${errorMessage}: ${error.message}`);
    return data as T;
  } catch (error) {
    console.error(`Error in supabaseQuery: ${error}`);
    throw error;
  }
}


// import supabase from '../supabase';
// import { Database } from '../types/supabase';

// type Tables = Database['public']['Tables'];

// // export default async function supabaseQuery<T extends keyof Tables>(
// //   table: T,
// //   query: (q: any) => any,
// //   errorMessage: string
// // ): Promise<Tables[T]['Row'] | Tables[T]['Row'][]> {
// //   try {
// //     const { data, error } = await query(supabase.from(table));
// //     if (error) throw new Error(`${errorMessage}: ${error.message}`);
// //     return data as Tables[T]['Row'] | Tables[T]['Row'][];
// //   } catch (error) {
// //     console.error(`Error in supabaseQuery: ${error}`);
// //     throw error;
// //   }
// // }
