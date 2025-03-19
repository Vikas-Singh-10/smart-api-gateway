export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  ENCRYPTION_IV: process.env.ENCRYPTION_IV || 'default-encryption-iv',
});
