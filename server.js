import 'dotenv/config';
import express from 'express';
import cors from 'cors';
const app = express();

app.use(cors()); // تفعيل CORS لجميع الطلبات
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment.');
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
    grant_type: 'client_credentials'
  });

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: 'POST',
      body: params
    });
    if (!res.ok) throw new Error('Failed to get token: ' + res.statusText);
    const data = await res.json(); // { access_token, expires_in, ... }
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
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
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'Accept': 'application/json',
      },
      body: queryBody
    });

    // اقرأ النص الكامل من الرد (حتى لو لم يكن json صالح)
    const text = await res.text();

    if (!res.ok) {
      console.error('IGDB returned non-OK status:', res.status, res.statusText);
      console.error('IGDB response body:', text);
      throw new Error(`IGDB API Error: ${res.status} ${res.statusText} - ${text}`);
    }

    // حاول تحويل النص إلى JSON (IGDB عادةً يرسل JSON)
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse IGDB JSON response:', err);
      console.error('Raw body:', text);
      throw new Error('Failed to parse IGDB JSON response');
    }

    // تعديل روابط الأغطية لتكون كاملة
    if (!Array.isArray(data)) return data;
    return data.map(game => {
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`;
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
const BASE_QUERY_FIELDS = 'fields id, name, cover.image_id, first_release_date, total_rating, game_type';
const BASE_QUERY_WHERE = `where (cover.image_id != null  & game_type = (0,8,9,10))`;


// 1. Top Rated
app.get('/top-rated', async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & total_rating_count > 20;
      sort total_rating desc;
      limit 10;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Recently Released
app.get('/recently-released', async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date < ${currentTimestamp} & total_rating_count > 5;
      sort first_release_date desc;
      limit 10;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Coming Soon
app.get('/coming-soon', async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp};
      sort first_release_date asc;
      limit 10;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Most Anticipated
app.get('/most-anticipated', async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp} & hypes > 0;
      sort hypes desc;
      limit 10;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Popular Right Now
app.get('/popular', async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE};
      sort popularity desc;
      limit 10;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// old
app.get('/nostalgia-corner', async (req, res) => {
  try {
    const query = `
fields name, first_release_date, total_rating_count, platforms cover.url, cover.image_id;
where (platforms = (6, 7, 8, 13) & first_release_date < 1167609600 & total_rating_count > 100);
sort total_rating_count desc;
limit 50;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/test-igdb', async (req, res) => {
  try {
    const query = `
      fields id, name, cover.url;
      where cover.url != null;
      limit 5;
    `;
    const data = await callIgdb('games', query);
    res.json(data);
  } catch (error) {
    console.error('/test-igdb error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ----- تشغيل السيرفر -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  /top-rated');
  console.log('  /recently-released');
  console.log('  /coming-soon');
  console.log('  /most-anticipated');
  console.log('  /popular');
  console.log('  /nostalgia-corner');
  console.log('  /test-igdb');
});
