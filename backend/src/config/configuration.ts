export interface AppConfig {
  port: number;
  mongodbUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  corsOrigin: string;
  uploadsDir: string;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/chat-app',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
});
