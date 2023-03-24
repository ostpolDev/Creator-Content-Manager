const {RateLimiterMemory} = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
    points: 6,
    duration: 1,
    blockDuration: 2
})

const apiRequestRateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 25,
    blockDuration: 5
})

const rateLimiterMiddleware = (req, res, next) => {
    rateLimiter.consume(req.ip).then(() => {
        next();
    }).catch(() => {
        res.status(429).send("Too many requests");
    })
}

const apiRequestRateLimiterMiddleware = (req, res, next) => {
    apiRequestRateLimiter.consume(req.ip).then(() => {
        next();
    }).catch(() => {
        res.status(429).send("Too many requests");
    })
}

module.exports = {rateLimiterMiddleware, apiRequestRateLimiterMiddleware};