const router = require('express').Router();
const validation = require('../modules/validation');
const cache = require("../modules/numberCache");
const { knex } = require('../modules/database');

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

router.get("/", validation.ensureAuthenticated, async (req, res, next) => {

    const userCount = await cache.GetCachedNumber("user_count", async () => {
        const newUserCount = await knex("users").count("id as CNT");
        return newUserCount[0].CNT;
    })

    res.render("users/index", {
        title: "Users",
        userCount
    })
})

module.exports = router;
