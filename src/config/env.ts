// Environment-based configuration
export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || "",
    databases: {
      prosmart: process.env.MONGODB_DB_PROSMART || "prosmart_db",
      hydralite: process.env.MONGODB_DB_HYDRALITE || "hydralite"
    },
    // Default database for backward compatibility
    db: process.env.MONGODB_DB || "prosmart_db"
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  }
};
