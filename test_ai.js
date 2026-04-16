require('dotenv').config();
const fetch = require('node-fetch');

async function testAI() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.log('No OPENROUTER_API_KEY in .env');
        return;
    }

    try {
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://smartgrocer.me',
                'X-Title': 'SmartGrocer Test'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                messages: [{ role: 'user', content: 'مرحبا، هل أنت متصل؟ قل نعم فقط' }]
            })
        });

        if (!aiRes.ok) {
            const err = await aiRes.text();
            console.error('API Error:', aiRes.status, err);
        } else {
            const data = await aiRes.json();
            console.log('API Success:', data.choices[0].message.content);
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testAI();
