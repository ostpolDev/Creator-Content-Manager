const router = require('express').Router();
const validation = require('../../modules/validation');

router.get("ping", (req, res) => {
    return res.status(200).json({success: true, msg: "pong"});
})

router.use("/users", require('./api_users'));
router.use("/assets", validation.ensureAuthenticated, require('./api_assets'));
router.use("/batches", validation.ensureAuthenticated, require('./api_batches'));
router.use("/channels", validation.ensureAuthenticated, require('./api_channels'));
router.use("/videos", validation.ensureAuthenticated, require('./api_videos'));

module.exports = router;
