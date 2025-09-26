import Redis from 'ioredis'

const redisClient = new Redis({
    // host: process.env.REDIS_HOST || 'localhost',
    // port: Number(process.env.REDIS_PORT) || 6379,
    // password: process.env.REDIS_PASSWORD || undefined,
    // db: Number(process.env.REDIS_DB) || 0,
    // tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
})

export default redisClient