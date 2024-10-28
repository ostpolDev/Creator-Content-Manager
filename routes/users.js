const router = require('express').Router();
const validation = require('../modules/validation');

router.get("/login", validation.ensureNotAuthenticated, (req, res) => {
    return res.render("users/login", {title: "Login"});
})

router.get("/register", validation.ensureNotAuthenticated, (req, res) => {
    return res.render("users/register", {title: "Register"});
})

router.get("/logout", validation.ensureAuthenticated, (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        return res.redirect("/");
    })
})

module.exports = router;
