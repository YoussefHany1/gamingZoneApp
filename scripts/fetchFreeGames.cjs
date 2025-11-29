const admin = require("firebase-admin");
const { EpicFreeGames } = require("epic-free-games"); // استخدام المكتبة بدلاً من axios مباشرة

const TOPIC_NAME = "epic_free_games";
const FIRESTORE_DOC_PATH = "system_metadata/epic_games_tracker";

// --- تهيئة Firebase (نسخاً من fetchRss.cjs لضمان العمل) ---
const initFirebase = () => {
  if (admin.apps.length) return admin.firestore();
  let serviceAccount = null;
  try {
    if (process.env.SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
    } else {
      serviceAccount = require("../serviceAccountKey.json");
    }
  } catch (e) {
    console.warn("⚠️ Service account not found, using default.");
  }
  const options = { projectId: process.env.FIREBASE_PROJECT_ID };
  if (serviceAccount)
    options.credential = admin.credential.cert(serviceAccount);
  else options.credential = admin.credential.applicationDefault();
  admin.initializeApp(options);
  return admin.firestore();
};

const db = initFirebase();

// --- الوظائف الأساسية ---

async function getGamesFromLibrary() {
  try {
    const epicFreeGames = new EpicFreeGames({
      country: "US",
      locale: "en-US",
      includeAll: true, // لجلب كل البيانات بما فيها الصور
    });

    const res = await epicFreeGames.getGames();
    // نحن مهتمون بالألعاب الحالية (Current Games) للإشعار الفوري
    return res.currentGames || [];
  } catch (error) {
    console.error("❌ Error fetching from library:", error);
    return [];
  }
}

async function sendNotification(game) {
  // استخراج الصورة المناسبة (كما هو موجود في تطبيقك)
  const image =
    game.keyImages?.find((i) => i.type === "Thumbnail")?.url ||
    game.keyImages?.[2]?.url ||
    game.keyImages?.[0]?.url;

  const message = {
    topic: TOPIC_NAME,
    notification: {
      title: "🎁 Free Game Alert!",
      body: `${game.title} is now FREE on Epic Games Store!`,
      imageUrl: image,
    },
    data: {
      // رابط اللعبة المباشر
      link: `https://store.epicgames.com/en-US/p/${
        game.productSlug || game.urlSlug
      }`,
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    },
    // إعدادات خاصة للأندرويد
    android: {
      notification: {
        channelId: "news_notifications",
        imageUrl: image,
      },
    },
    // إعدادات خاصة للـ iOS
    apns: {
      payload: { aps: { "mutable-content": 1 } },
      fcm_options: { image: image },
    },
  };

  try {
    await admin.messaging().send(message);
    console.log(`✅ Notification sent for: ${game.title}`);
  } catch (error) {
    console.error(`❌ Notification failed for ${game.title}:`, error.message);
  }
}

async function run() {
  console.log("🚀 Checking for Free Games using epic-free-games lib...");

  // 1. جلب الألعاب باستخدام المكتبة
  const currentGames = await getGamesFromLibrary();

  if (currentGames.length === 0) {
    console.log("No active free games found via library.");
    process.exit(0);
  }

  // 2. قراءة الألعاب المخزنة سابقاً (لمنع التكرار)
  const docRef = db.doc(FIRESTORE_DOC_PATH);
  const docSnap = await docRef.get();
  // نستخدم productSlug أو id كمعرف فريد
  const knownGameIds = docSnap.exists ? docSnap.data().knownIds || [] : [];

  // 3. تحديد الألعاب الجديدة
  const newGames = [];
  const currentIds = [];

  for (const game of currentGames) {
    // نعتمد على الـ ID أو الـ Slug لضمان التفرد
    const uniqueId = game.id || game.productSlug;
    currentIds.push(uniqueId);

    if (!knownGameIds.includes(uniqueId)) {
      newGames.push(game);
    }
  }

  // 4. إرسال الإشعارات والتحديث
  if (newGames.length > 0) {
    console.log(
      `🎉 Found ${newGames.length} new games! Sending notifications...`
    );

    for (const game of newGames) {
      await sendNotification(game);
    }

    // تحديث القائمة في قاعدة البيانات
    await docRef.set({
      knownIds: currentIds,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    console.log("✅ No new games detected. Database is up to date.");
  }

  process.exit(0);
}

run();
