// ===============================
// CONEXIÓN SUPABASE DECOM
// ===============================


const SUPABASE_URL = "https://kjbsaiaiuafbbleruitj.supabase.co";

const SUPABASE_KEY = "sb_publishable_K9XAeQmzxK7-jANNEmrd0Q_u3WBFjxT";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


console.log(
    "Supabase conectado correctamente"
);