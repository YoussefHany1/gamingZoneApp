// scripts/fetchFreeGames.cjs
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config({ path: "E:\\Programing\\GamingZone2\\.env" });

const { Client, Databases, Query } = require("node-appwrite");

// --- CONFIGURATION ---
const CONFIG = {
  COLLECTION_FREE_GAMES: process.env.FREE_GAMES_COLLECTION_ID || "free_games",
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
  EPIC_API_URL:
    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US",
  // اسم التوبيك الذي سيشترك فيه المستخدمون
  FCM_TOPIC: "free_games_alerts",
};

// --- INIT APPWRITE ---
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// --- INIT FIREBASE ADMIN ---
let admin = null;
let fcmEnabled = false;

try {
  admin = require("firebase-admin");
  if (process.env.FCM_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    // تأكد من عدم تهيئة التطبيق إذا كان مهيأ مسبقاً (في حال دمج السكريبتات)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(svc),
        projectId: svc.project_id,
      });
    }
    fcmEnabled = true;
    console.log("✅ Firebase Admin initialized.");
  }
} catch (e) {
  console.warn("⚠️ Firebase error:", e.message);
}

// --- HELPERS ---
// --- HELPERS ---
// دالة لتنظيف الـ Slug لضمان ثبات الـ ID
const cleanSlug = (rawSlug, title) => {
  if (rawSlug) return rawSlug.toLowerCase().trim();
  // لو مفيش slug نستخدم الاسم بعد تنظيفه
  return title.toLowerCase().replace(/[^a-z0-9]/g, "-");
};

const generateDocId = (slug) => {
  return crypto.createHash("sha1").update(slug).digest("hex").substring(0, 36);
};

// --- NOTIFICATION FUNCTION ---
async function sendGameNotification(game) {
  if (!fcmEnabled) return;
  const imageLink = game.image || null;
  const message = {
    topic: CONFIG.FCM_TOPIC,
    notification: {
      title: "New Free Game! 🎁",
      body: `${game.title} is now free on Epic Games Store!`,
      ...(imageLink && { image: imageLink }),
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "free_games_channel", // تأكد من إنشاء هذه القناة في التطبيق
        ...(imageLink && { image: imageLink }),
      },
    },
    data: {
      type: "free_game",
      slug: game.slug || "",
      clickAction: "FLUTTER_NOTIFICATION_CLICK", // أو Action المناسب لتطبيقك
    },
  };

  try {
    await admin.messaging().send(message);
    console.log(`   🔔 Notification sent for: ${game.title}`);
  } catch (error) {
    console.error(`   ❌ Notification failed: ${error.message}`);
  }
}

// --- FETCHING LOGIC ---
async function fetchEpicGames() {
  // ... (نفس دالة fetchEpicGames السابقة بدون تغيير) ...
  try {
    console.log("📥 Fetching from Epic Games...");
    const response = await axios.get(CONFIG.EPIC_API_URL);
    const allGames = response.data.data.Catalog.searchStore.elements;

    // 1. Filter Current Free Games
    const currentGames = allGames
      .filter((game) => {
        const promotions = game.promotions;
        // التأكد من وجود الهيكل الأساسي للعروض
        if (
          !promotions ||
          !promotions.promotionalOffers ||
          promotions.promotionalOffers.length === 0
        )
          return false;

        // الوصول للعرض الفعلي (عادة يكون داخل مصفوفة متداخلة)
        const offerGroup = promotions.promotionalOffers[0];
        if (
          !offerGroup.promotionalOffers ||
          offerGroup.promotionalOffers.length === 0
        )
          return false;

        const offer = offerGroup.promotionalOffers[0];

        // التحقق من أن الخصم موجود وأن النسبة 0 (يعني مجانية)
        if (!offer || !offer.discountSetting) return false;
        return offer.discountSetting.discountPercentage === 0;
      })
      .map((game) => normalizeGame(game, "current"));

    // 2. Filter Upcoming Free Games
    const nextGames = allGames
      .filter((game) => {
        const promotions = game.promotions;
        if (
          !promotions ||
          !promotions.upcomingPromotionalOffers ||
          promotions.upcomingPromotionalOffers.length === 0
        ) {
          return false;
        }
        const offer =
          promotions.upcomingPromotionalOffers[0].promotionalOffers[0];
        if (!offer || !offer.discountSetting) return false;
        return offer.discountSetting.discountPercentage === 0;
      })
      .map((game) => normalizeGame(game, "next"));

    return [...currentGames, ...nextGames];
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

// --- NORMALIZATION ---
function normalizeGame(item, type) {
  const imageUrl =
    item.keyImages?.find((i) => i.type === "Thumbnail")?.url ||
    item.keyImages?.[0]?.url ||
    null;

  // محاولة استخراج الـ slug بأكثر من طريقة
  let rawSlug =
    item.offerMappings?.[0]?.pageSlug ||
    item.urlSlug ||
    item.productSlug ||
    null;

  const title = item.title;

  // تنظيف الـ slug لضمان ثبات المعرف
  const finalSlug = cleanSlug(rawSlug, title);

  let startDate = null;
  let endDate = null;

  if (type === "current") {
    const offer = item.promotions.promotionalOffers[0].promotionalOffers[0];
    startDate = offer.startDate;
    endDate = offer.endDate;
  } else {
    const offer =
      item.promotions.upcomingPromotionalOffers[0].promotionalOffers[0];
    startDate = offer.startDate;
    endDate = offer.endDate;
  }

  return {
    originalId: item.id,
    title: title,
    description: item.description || "",
    image: imageUrl,
    slug: finalSlug, // نستخدم الـ slug المنظف
    type: type,
    startDate: startDate,
    endDate: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

// --- MAIN PROCESS ---
// --- MAIN PROCESS ---
async function run() {
  console.log("🚀 Starting Free Games Fetcher (Safe-Update Mode)...");

  try {
    const rawGames = await fetchEpicGames();
    console.log(`📥 Fetched ${rawGames.length} entries from Epic.`);

    // 1. منع التكرار (Deduplication)
    const uniqueGamesMap = new Map();
    for (const game of rawGames) {
      const docId = generateDocId(game.slug);
      if (!uniqueGamesMap.has(docId)) {
        uniqueGamesMap.set(docId, game);
      }
    }
    const uniqueGames = Array.from(uniqueGamesMap.values());
    console.log(`✅ Processing ${uniqueGames.length} unique games.`);

    const activeIds = new Set();

    for (const game of uniqueGames) {
      const docId = generateDocId(game.slug);
      activeIds.add(docId);

      console.log(`\n🎮 Processing: ${game.title}`);

      let existingDoc = null;

      try {
        existingDoc = await databases.getDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_FREE_GAMES,
          docId
        );
      } catch (e) {
        if (e.code !== 404)
          console.error(`   ❌ Error fetching doc: ${e.message}`);
      }

      if (!existingDoc) {
        // --- لعبة جديدة ---
        try {
          let notificationSent = false;
          if (game.type === "current") {
            await sendGameNotification(game);
            notificationSent = true;
          }

          await databases.createDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            { ...game, notificationSent: notificationSent }
          );
          console.log(`   ✨ Created NEW game document.`);
        } catch (createError) {
          console.error(`   ❌ Failed to create: ${createError.message}`);
        }
      } else {
        // --- لعبة موجودة مسبقاً ---
        const alreadySent = existingDoc.notificationSent === true;

        if (game.type === "current" && !alreadySent) {
          // الحالة: اللعبة أصبحت مجانية الآن ولم نرسل لها من قبل
          console.log(`   🔔 Sending delayed notification...`);
          await sendGameNotification(game);

          await databases.updateDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            { ...game, notificationSent: true }
          );
          console.log(`   ✅ Updated doc: Notification marked as SENT.`);
        } else {
          // الحالة: تحديث بيانات عادي
          // التعديل الهام جداً هنا: 👇
          // بنقول للداتابيز: خد بيانات اللعبة الجديدة، بس حافظ على قيمة notificationSent القديمة
          await databases.updateDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            {
              ...game,
              notificationSent: alreadySent, // التأكيد على حفظ الحالة القديمة
            }
          );
          console.log(
            `   ℹ️ Updated details. Notification Status: ${
              alreadySent ? "✅ Already Sent" : "⏳ Not Sent Yet"
            }`
          );
        }
      }
    }

    // --- CLEANUP ---
    console.log("\n🧹 Cleaning up old games...");
    const existingDocs = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      [Query.limit(100)]
    );

    const deletePromises = existingDocs.documents
      .filter((doc) => !activeIds.has(doc.$id))
      .map((doc) =>
        databases.deleteDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_FREE_GAMES,
          doc.$id
        )
      );

    await Promise.all(deletePromises);
  } catch (e) {
    console.error("Fatal Error:", e);
  }

  console.log("\n--- Done. ---");
  process.exit(0);
}

run();
