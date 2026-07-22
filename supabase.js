// ===============================
// CONEXIÓN SUPABASE DECOM
// ===============================


const SUPABASE_URL = "TU_URL_AQUI";

const SUPABASE_KEY = "TU_ANON_KEY_AQUI";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


console.log(
    "Supabase conectado correctamente"
);