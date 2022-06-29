const express = require('express');
const router = express.Router();

const limiter = require('../../modules/rateLimiter');

router.use("*", limiter.rateLimiterMiddleware, (req, res, next) => {
    next();
})

router.get("/", (req, res) => {
    res.status(200).json({msg: "Hello World!"});
})

router.use("/channels", require('./channels'));
router.use("/videos", require('./videos'));
router.use("/assets", require('./assets'));
router.use("/batches", require('./batches'));
router.use("/users", require('./users'));

module.exports = router;