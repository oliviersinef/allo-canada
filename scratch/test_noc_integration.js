const SUPABASE_URL = "https://cmgzoojrbqpnxmadwkdx.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZ3pvb2pyYnFwbnhtYWR3a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDAyMjUsImV4cCI6MjA5MTUxNjIyNX0.aqZTo_81TM_9aFEWKtRCZWsRAD33T08ENLtLg0XqdUU";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;

async function testChat(query) {
    console.log(`Testing query: "${query}"`);
    try {
        const res = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`,
                'apikey': ANON_KEY
            },
            body: JSON.stringify({
                message: query,
                history: []
            })
        });
        
        const data = await res.json();
        console.log("AI Response:");
        console.log(data.reply);
        console.log("Suggestions:", data.suggestions);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testChat("Quel est mon code CNP ? Je travaille comme développeur de logiciels au Canada.");
