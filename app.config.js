import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: "com.yh.gamingzone",
    },
    extra: {
      ...config.extra,
      APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,

      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    },
  };
};
