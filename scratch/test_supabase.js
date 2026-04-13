
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://cmgzoojrbqpnxmadwkdx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZ3pvb2pyYnFwbnhtYWR3a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDAyMjUsImV4cCI6MjA5MTUxNjIyNX0.aqZTo_81TM_9aFEWKtRCZWsRAD33T08ENLtLg0XqdUU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log("Testing Supabase connection...");
    try {
        const { data, error } = await supabase.from('settings').select('*').limit(1);
        if (error) {
            console.error("Connection error:", error.message);
            process.exit(1);
        }
        console.log("Connection successful! Settings count:", data.length);
        process.exit(0);
    } catch (err) {
        console.error("Unexpected error:", err.message);
        process.exit(1);
    }
}

testConnection();
