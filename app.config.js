import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: "com.yh.gamingzone",
    },
    extra: {
      APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
      APPWRITE_PROJECT: process.env.APPWRITE_PROJECT,
      APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
      APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
      RSS_COLLECTION_ID: process.env.RSS_COLLECTION_ID,
      COLLECTION_FREE_GAMES: process.env.COLLECTION_FREE_GAMES,
      ARTICLES_COLLECTION_ID: process.env.ARTICLES_COLLECTION_ID,
      FCM_SERVICE_ACCOUNT: process.env.FCM_SERVICE_ACCOUNT,

      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,

      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
    },
  };
};
