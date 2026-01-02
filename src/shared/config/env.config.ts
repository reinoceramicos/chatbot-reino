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
};
