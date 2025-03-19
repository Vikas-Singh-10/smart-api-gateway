export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGO_URI,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  ENCRYPTION_IV: process.env.ENCRYPTION_IV || 'default-encryption-iv',
});
