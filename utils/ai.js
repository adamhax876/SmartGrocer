const axios = require('axios');

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

        const aiRes = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [
                { role: 'system', content: 'أنت محلل أعمال تجزئة خبير. اكتب بالعربية فقط.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500
        }, {
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://smartgrocer.me',
                'X-Title': 'SmartGrocer AI Cron'
            }
        });

        const aiData = aiRes.data;
        return aiData.choices[0].message.content;

    } catch (error) {
        let msg = error.message;
        if (error.response && error.response.data) {
            msg = JSON.stringify(error.response.data);
        }
        console.error('OpenRouter AI Error:', msg);
        return "حدث خطأ أثناء التواصل مع خدمات الذكاء الاصطناعي.";
    }
}

module.exports = {
    generateAIReport
};
