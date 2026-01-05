export const envConfig = {
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN || "",
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
    verifyToken: process.env.META_VERIFY_TOKEN || "",
    apiVersion: process.env.META_API_VERSION || "v18.0",
  },
  server: {
    port: process.env.PORT || 3000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "reino-ceramicos-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
};
