export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "https://forex-signals-pro.onrender.com",
  polygonApiKey: process.env.POLYGON_API_KEY ?? "",
};
