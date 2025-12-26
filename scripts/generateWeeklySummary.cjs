const sdk = require("node-appwrite");
require("dotenv").config({ path: "F:\\Programing\\GamingZone\\.env" });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NEWS_COLLECTION_ID = process.env.ARTICLES_COLLECTION_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

async function generateSummary() {
  try {
    console.log("Fetching news from the last 7 days...");

    // حساب تاريخ قبل 7 أيام
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const sevenDaysAgo = date.toISOString();

    // جلب الأخبار
    const response = await databases.listDocuments(
      DATABASE_ID,
      NEWS_COLLECTION_ID,
      [
        sdk.Query.greaterThan("pubDate", sevenDaysAgo), // تأكد أن اسم الحقل صحيح في قاعدة بياناتك
        sdk.Query.limit(200), // نأخذ أهم 200 خبر مثلاً لتجنب تجاوز حدود الـ Token
      ]
    );

    if (response.documents.length === 0) {
      console.log("No news found to summarize.");
      return;
    }

    // تجهيز النص للذكاء الاصطناعي
    let newsText = "";
    response.documents.forEach((doc, index) => {
      newsText += `- ${doc.title}\n`;
    });

    console.log(
      `Found ${response.documents.length} articles. Sending to AI...`
    );

    // استدعاء Gemini API
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional gaming news editor. 
                        Analyze the provided list of gaming news HEADLINES and create a Weekly Recap in TWO languages (Arabic and English).

                        IMPORTANT: Return the result strictly as a valid JSON object. Do NOT add Markdown formatting like \`\`\`json.
                        
                        The JSON structure must be:
                        {
                            "arabic": "## ملخص الأسبوع ... (Write the summary based on these headlines using Markdown and emojis)",
                            "english": "## Weekly Recap ... (Write the summary based on these headlines using Markdown and emojis)"
                        }

                        The Headlines List:
                        ${newsText}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const aiData = await aiResponse.json();
    if (aiData.error) {
      console.error(
        "❌ Google Gemini API Error:",
        JSON.stringify(aiData.error, null, 2)
      );
      return; // توقف هنا
    }

    if (!aiData.candidates || aiData.candidates.length === 0) {
      console.error(
        "❌ No candidates returned. Full Response:",
        JSON.stringify(aiData, null, 2)
      );
      // قد يكون السبب Safety Filters
      if (aiData.promptFeedback) {
        console.log("Prompt Feedback:", aiData.promptFeedback);
      }
      return;
    }
    let rawText = aiData.candidates[0].content.parts[0].text;
    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonSummary = JSON.parse(rawText);

    console.log("Summary generated successfully. Saving to Appwrite...");

    // حفظ الملخص في قاعدة البيانات
    await databases.createDocument(
      DATABASE_ID,
      SUMMARIES_COLLECTION_ID,
      sdk.ID.unique(),
      {
        summary_ar: jsonSummary.arabic,
        summary_en: jsonSummary.english,
        startDate: sevenDaysAgo,
        endDate: new Date().toISOString(),
      }
    );

    console.log("Weekly summary saved!");
  } catch (error) {
    console.error("Error generating summary:", error);
    if (error instanceof SyntaxError) {
      console.log("JSON Parse Error. The AI might have included extra text.");
    }
  }
}

generateSummary();
