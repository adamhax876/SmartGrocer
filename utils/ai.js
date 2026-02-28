const axios = require('axios');

/**
 * Generate an AI report for the store using Gemini API.
 * 
 * @param {Object} storeData - Object containing total sales, top products, etc.
 * @returns {Promise<String>}
 */
async function generateAIReport(storeData) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.log('No GEMINI_API_KEY found. Generating a standard text report instead.');
            return `تقرير المتجر الآلي:\nإجمالي المبيعات: ${storeData.totalSales} ج.م\nالمنتج الأكثر مبيعاً: ${storeData.topProduct}\nالمنتج الأقل مبيعاً: ${storeData.worstProduct}\n\nتوصيات النظام: يرجى مراجعة مخزون المنتجات الأكثر مبيعاً وعمل خصومات على المنتجات الأقل لزيادة السيولة. لمزيد من التحليل بالذكاء الاصطناعي يرجى إضافة مفتاح GEMINI_API_KEY في إعدادات السيرفر.`;
        }

        const prompt = `أنت خبير ذكاء اصطناعي متخصص في تجارة التجزئة والبقالة. 
قم بتحليل بيانات مبيعات المتجر التالية، وقدم 3 توصيات ذكية جداً وقابلة للتنفيذ في نقاط مختصرة لمضاعفة الأرباح:
- إجمالي المبيعات هكذا: ${storeData.totalSales} ج.م
- المنتج الأكثر مبيعاً: ${storeData.topProduct}
- المنتج الأقل مبيعاً (الميت): ${storeData.worstProduct}
- المنتجات التي أوشكت على النفاذ: ${storeData.lowStock}
اكتب تقريراً باللغة العربية، بأسلوب احترافي ومشجع لصاحب المتجر.`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            }
        );

        if (response.data && response.data.candidates && response.data.candidates[0]) {
            return response.data.candidates[0].content.parts[0].text;
        }

        return "فشل الذكاء الاصطناعي في تحليل البيانات في الوقت الحالي.";
    } catch (error) {
        console.error('Gemini AI Error:', error.response?.data || error.message);
        return "حدث خطأ أثناء التواصل مع خدمات الذكاء الاصطناعي.";
    }
}

module.exports = {
    generateAIReport
};
