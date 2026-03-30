// Antes: import { createClient } from "@supabase/supabase-client";
import { createClient } from "@supabase/supabase-js"; // CAMBIAR A ESTO

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'rbgct' // Asegúrate de mantener tu esquema personalizado
  }
});