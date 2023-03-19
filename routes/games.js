const router = require('express').Router();

router.get("/", (req, res) => {
    res.render('games/index', {
        title: "Games"
    })
})

module.exports = router;