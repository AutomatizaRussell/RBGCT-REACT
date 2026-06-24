// Cliente Supabase para el módulo de Vacantes (Portal de Empleo).
// Réplica exacta de la config del proyecto intranet-russell (js/supabaseClient.js):
// mismo host, misma anon key pública y schema 'rbgct' por defecto.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.rbsupabase.rbgct.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTQ4ODk0MCwiZXhwIjo0OTM1MTYyNTQwLCJyb2xlIjoiYW5vbiJ9.LgDk68gU-GMfse0CHjrFsaDwl_SDzmiP4g5yytTDrcE';

export const supabaseVacantes = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'rbgct' },
});
