import "dotenv/config";
import express from "express";
import cors from "cors";
const app = express();

app.use(cors()); // تفعيل CORS لجميع الطلبات
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment."
  );
  process.exit(1);
}

// ----- كود المصادقة الخاص بك (ممتاز كما هو) -----
let cachedToken = null; // { token, expiresAt }

async function getAppToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10000) {
    return cachedToken.token;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: "POST",
      body: params,
    });
    if (!res.ok) throw new Error("Failed to get token: " + res.statusText);
    const data = await res.json(); // { access_token, expires_in, ... }
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (error) {
    console.error("Error getting app token:", error);
    throw error; // إرمي الخطأ ليتم التعامل معه في الـ endpoint
  }
}

async function callIgdb(apiEndpoint, queryBody) {
  try {
    const token = await getAppToken();

    const res = await fetch(`https://api.igdb.com/v4/${apiEndpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
        Accept: "application/json",
      },
      body: queryBody,
    });

    // اقرأ النص الكامل من الرد (حتى لو لم يكن json صالح)
    const text = await res.text();

    if (!res.ok) {
      console.error("IGDB returned non-OK status:", res.status, res.statusText);
      console.error("IGDB response body:", text);
      throw new Error(
        `IGDB API Error: ${res.status} ${res.statusText} - ${text}`
      );
    }

    // حاول تحويل النص إلى JSON (IGDB عادةً يرسل JSON)
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse IGDB JSON response:", err);
      console.error("Raw body:", text);
      throw new Error("Failed to parse IGDB JSON response");
    }

    // تعديل روابط الأغطية لتكون كاملة
    if (!Array.isArray(data)) return data;
    return data.map((game) => {
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace(
          "t_thumb",
          "t_cover_big"
        )}`;
      }
      return game;
    });
  } catch (error) {
    console.error("Error calling IGDB:", error);
    throw error;
  }
}
// ----- الـ Endpoints المطلوبة -----

// دالة مُساعدة لإنشاء الاستعلامات الأساسية
const currentTimestamp = Math.floor(Date.now() / 1000);
const BASE_QUERY_FIELDS =
  "fields id, name, cover.image_id, first_release_date, total_rating, game_type";
const BASE_QUERY_WHERE = `where (cover.image_id != null  & game_type = (0,8,9,10))`;

app.get("/", (req, res) => {
  res.send("Gaming Zone API is working! 🚀");
});

// 1. Top Rated
app.get("/top-rated", async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & total_rating_count > 20;
      sort total_rating desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Recently Released
app.get("/recently-released", async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date < ${currentTimestamp} & total_rating_count > 5;
      sort first_release_date desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Coming Soon
app.get("/coming-soon", async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp};
      sort first_release_date asc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Most Anticipated
app.get("/most-anticipated", async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp} & hypes > 0;
      sort hypes desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Popular Right Now
app.get("/popular", async (req, res) => {
  try {
    // الخطوة 1: جلب الـ IDs من popularity_primitives
    // هنا نقوم بفرز النتائج حسب القيمة (value) تنازلياً للحصول على الأكثر شعبية
    const primitivesQuery = `
      fields game_id;
      sort value desc;
      where popularity_type = 5;
      limit 10;
    `;

    // نطلب الـ IDs أولاً
    const primitivesData = await callIgdb(
      "popularity_primitives",
      primitivesQuery
    );

    if (!primitivesData || primitivesData.length === 0) {
      return res.json([]);
    }

    // الخطوة 2: استخراج الـ IDs من النتائج
    const gameIds = primitivesData.map((p) => p.game_id).join(",");

    // الخطوة 3: استخدام الـ IDs لجلب تفاصيل الألعاب الكاملة
    const gamesQuery = `
      ${BASE_QUERY_FIELDS};
      where id = (${gameIds});
    `;

    const gamesData = await callIgdb("games", gamesQuery);

    // الخطوة 4: إعادة ترتيب الألعاب لتطابق ترتيب الشعبية (لأن الـ where لا يضمن الترتيب)
    const sortedGames = primitivesData
      .map((p) => gamesData.find((g) => g.id === p.game_id))
      .filter((g) => g); // تصفية أي نتائج غير موجودة (undefined)

    res.json(sortedGames);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// old
app.get("/nostalgia-corner", async (req, res) => {
  try {
    const query = `
${BASE_QUERY_FIELDS};
where (platforms = (6, 7, 8, 13) & first_release_date < 1167609600 & total_rating_count > 100);
sort popularity desc;
limit 50;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/search", async (req, res) => {
  try {
    // search query parameter
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query "q" is required' });
    }

    // تنظيف النص لتجنب أخطاء الكوتيشن (Sanitization)
    const safeQuery = q.replace(/"/g, '\\"');

    const query = `
      ${BASE_QUERY_FIELDS};
      search "${safeQuery}";
      limit 50;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/game-details", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Game ID is required" });
    }

    // 1. بناء الـ Multi-query
    // نقوم بتعريف استعلامين: واحد باسم "Game" وواحد باسم "TimeToBeat"
    const query = `
      query games "Game" {
        fields id, name, cover.image_id, cover.url, first_release_date, total_rating, total_rating_count, summary, dlcs, game_type, multiplayer_modes, remakes, remasters, screenshots.image_id, release_dates.human, platforms.abbreviation, websites.type, websites.url, genres.name, game_modes.name, language_supports.language.name, language_supports.language_support_type.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_engines.name, videos.name, videos.video_id, collection.name, similar_games.name, similar_games.cover.image_id, collections.games.name, collections.games.cover.image_id;
        where id = ${id};
        limit 1;
      };
      
      query game_time_to_beats "TimeToBeat" {
        fields normally, hastily, completely, game_id;
        where game_id = ${id};
      };
    `;

    // 2. استدعاء الـ endpoint المسمى "multiquery"
    const data = await callIgdb("multiquery", query);

    // 3. معالجة البيانات القادمة (تكون عبارة عن مصفوفة تحتوي نتائج الاستعلامين)
    // النتيجة تكون: [{ name: "Game", result: [...] }, { name: "TimeToBeat", result: [...] }]
    const gameResult = data.find((item) => item.name === "Game");
    const timeResult = data.find((item) => item.name === "TimeToBeat");

    // استخراج كائن اللعبة
    let game =
      gameResult && gameResult.result.length > 0 ? gameResult.result[0] : null;

    // استخراج بيانات الوقت
    const timeToBeat =
      timeResult && timeResult.result.length > 0 ? timeResult.result[0] : null;

    if (game) {
      // إصلاح رابط الغلاف يدوياً هنا لأن دالة callIgdb الأصلية
      // لا يمكنها الوصول لداخل هيكلية الـ multiquery
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace(
          "t_thumb",
          "t_cover_big"
        )}`;
      }

      // دمج بيانات الوقت داخل كائن اللعبة
      if (timeToBeat) {
        // نقوم بحذف الـ id و game_id من بيانات الوقت لأنها مكررة ولا داعي لها
        delete timeToBeat.id;
        delete timeToBeat.game_id;

        game.game_time_to_beats = timeToBeat;
      } else {
        game.game_time_to_beats = null;
      }
    }

    res.json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default app;
