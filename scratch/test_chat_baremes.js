const SUPABASE_URL = 'https://cmgzoojrbqpnxmadwkdx.supabase.co';
const FUNC_URL = `${SUPABASE_URL}/functions/v1/chat`;

async function testChat() {
    console.log("Testing chat with TCF scores 433 CO, 426 CE...");
    const response = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            message: "J'ai passé le TCF Canada. Mes scores sont : Compréhension orale 433 et Compréhension écrite 426. Quel est mon niveau NCLC ?" 
        })
    });
    
    if (!response.ok) {
        console.error("Chat failed:", await response.text());
        return;
    }
    
    const result = await response.json();
    console.log("AI Reply:", result.reply);
}

testChat();
