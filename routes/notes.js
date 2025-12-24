const router = require('express').Router();

router.get("/", (req, res) => {
    res.render("notes/index", {
        title: "Notes"
    })
})

module.exports = router;
