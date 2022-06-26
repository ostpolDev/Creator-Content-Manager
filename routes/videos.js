const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');

router.get("/", validation.ensureAuthenticated, (req, res) => {
    res.render('videos/index', {
        title: "Videos"
    })
})

module.exports = router;