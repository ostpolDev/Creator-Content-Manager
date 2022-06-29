const express = require('express');
const router = express.Router();

const validation = require('../../modules/validation');

router.get("/", (req, res) => {
    res.status(200).json({msg: "Hello World!"});
})

router.use("/channels", require('./channels'));
router.use("/videos", require('./videos'));
router.use("/assets", require('./assets'));
router.use("/batches", require('./batches'));

module.exports = router;