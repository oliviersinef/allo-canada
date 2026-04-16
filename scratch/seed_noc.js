const fs = require('fs');

const SUPABASE_URL = "https://cmgzoojrbqpnxmadwkdx.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZ3pvb2pyYnFwbnhtYWR3a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDAyMjUsImV4cCI6MjA5MTUxNjIyNX0.aqZTo_81TM_9aFEWKtRCZWsRAD33T08ENLtLg0XqdUU";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;

const data = JSON.parse(fs.readFileSync('noc_rag_data.json', 'utf8'));

async function seed() {
    console.log(`Starting seed of ${data.length} documents...`);
    
    // Split into batches to avoid overwhelming the function
    const batchSize = 5;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(data.length / batchSize)}...`);
        
        await Promise.all(batch.map(async (doc) => {
            try {
                const res = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ANON_KEY}`,
                        'apikey': ANON_KEY
                    },
                    body: JSON.stringify({
                        action: 'add_document',
                        ...doc
                    })
                });
                if (!res.ok) {
                    const err = await res.text();
                    console.error(`Failed to add ${doc.title}: ${err}`);
                } else {
                    console.log(`Added: ${doc.title}`);
                }
            } catch (err) {
                console.error(`Error adding ${doc.title}:`, err);
            }
        }));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("Seeding complete!");
}

seed();
