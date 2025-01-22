export class RedisError extends Error {
    constructor(message, code = 'REDIS_ERROR') {
        super(message);
        this.name = 'RedisError';
        this.code = code;
    }
}