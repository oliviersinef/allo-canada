const SUPABASE_URL = 'https://cmgzoojrbqpnxmadwkdx.supabase.co';
const FUNC_URL = `${SUPABASE_URL}/functions/v1/chat`;

async function seed() {
    console.log("Seeding documents...");
    const response = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'seed' })
    });
    
    if (!response.ok) {
        console.error("Seed failed:", await response.text());
        return;
    }
    
    const result = await response.json();
    console.log("Seed result:", result);
}

seed();
