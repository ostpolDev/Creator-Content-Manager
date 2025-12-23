const router = require('express').Router();
const hints = require('../modules/hints');
const validation = require('../modules/validation');

router.get("/", async (req, res) => {
    res.render("index", {
        hint: hints.getHint()
    })
})

router.get("/logout", (req, res) => {
    res.redirect("/users/logout")
})

router.use("/users", require('./users'))
router.use("/assets", validation.ensureAuthenticated, require('./assets'));
router.use("/channels", validation.ensureAuthenticated, require('./channels'));
router.use("/videos", validation.ensureAuthenticated, require('./videos'));
router.use("/resources", validation.ensureAuthenticated, require('./resources'));
router.use("/games", validation.ensureAuthenticated, require('./games'));
router.use("/notes", validation.ensureAuthenticated, require('./notes'));

router.use("/api", require('./api/index'));

module.exports = router;
