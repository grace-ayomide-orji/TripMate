// import { createClient } from '@supabase/supabase-js'


// // Validate environment variables
// if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
//   throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
// }

// if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
//   throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
// }

// // Create the client (this is like opening a connection to your database)
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   {
//     auth: {
//       persistSession: true,     
//       autoRefreshToken: true,    
//       detectSessionInUrl: true 
//     }
//   }
// )


import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables (optional, but good practice)
if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)