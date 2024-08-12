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

