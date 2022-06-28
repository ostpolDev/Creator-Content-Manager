const express = require('express');
const router = express.Router();

const validation = require('../../modules/validation');

router.get("/", (req, res) => {
    res.status(200).json({msg: "Hello World!"});
})

router.use("/channels", require('./channels'));

module.exports = router;