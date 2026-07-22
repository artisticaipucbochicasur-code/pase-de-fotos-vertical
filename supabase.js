// ===============================
// CONEXIÓN SUPABASE DECOM
// ===============================


const SUPABASE_URL = "https://kjbsaiaiuafbbleruitj.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYnNhaWFpdWFmYmJsZXJ1aXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjcxNjIsImV4cCI6MjEwMDMwMzE2Mn0.1L8JGyvSzw0aOTPm2jX921f-U_uw-P0a0jpkE4pEKCA";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


console.log(
    "Supabase conectado correctamente"
);