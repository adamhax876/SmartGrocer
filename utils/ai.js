const fetch = require('node-fetch');

/**
 * Generate an AI report for the store using OpenRouter API.
 * 
 * @param {Object} storeData - Object containing total sales, top products, etc.
 * @returns {Promise<String>}
 */
async function generateAIReport(storeData) {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.log('No OPENROUTER_API_KEY found. Generating a standard text report instead.');
            return `تقرير المتجر الآلي:\nإجمالي المبيعات: ${storeData.totalSales}\nالمنتج الأكثر مبيعاً: ${storeData.topProduct}\nالمنتج الأقل مبيعاً: ${storeData.worstProduct}\n\nتوصيات النظام: يرجى مراجعة مخزون المنتجات الأكثر مبيعاً وعمل خصومات على المنتجات الأقل لزيادة السيولة.`;
        }

        const prompt = `أنت خبير ذكاء اصطناعي متخصص في تجارة التجزئة والبقالة. 
قم بتحليل بيانات مبيعات المتجر التالية، وقدم 3 توصيات ذكية جداً وقابلة للتنفيذ في نقاط مختصرة لمضاعفة الأرباح:
- إجمالي المبيعات: ${storeData.totalSales}
- المنتج الأكثر مبيعاً: ${storeData.topProduct}
- المنتج الأقل مبيعاً (الميت): ${storeData.worstProduct}
- المنتجات التي أوشكت على النفاذ: ${storeData.lowStock}
اكتب تقريراً باللغة العربية، بأسلوب احترافي ومشجع لصاحب المتجر.`;

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://smartgrocer.me',
                'X-Title': 'SmartGrocer AI Cron'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick:free',
                messages: [
                    { role: 'system', content: 'أنت محلل أعمال تجزئة خبير. اكتب بالعربية فقط.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500
            })
        });

        if (!aiRes.ok) {
            const errText = await aiRes.text();
            throw new Error('OpenRouter error: ' + errText);
        }

        const aiData = await aiRes.json();
        return aiData.choices[0].message.content;

    } catch (error) {
        console.error('OpenRouter AI Error:', error.message);
        return "حدث خطأ أثناء التواصل مع خدمات الذكاء الاصطناعي.";
    }
}

module.exports = {
    generateAIReport
};
