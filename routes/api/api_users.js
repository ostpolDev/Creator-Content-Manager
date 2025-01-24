const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const encryption = require('../../modules/encryption');
const { knex } = require('../../modules/database');
const passport = require('passport');
const validation = require('../../modules/validation');

router.post("/register", validation.ensureNotAuthenticated, [
    body("username", "Username is required").notEmpty(),
    body("username", "Username cannot be longer than 64 characters").isLength({max: 64}),
    body("username", "Username cannot contain special characters").isAlphanumeric(),
    body("password", "Password is required").notEmpty(),
    body("name", "Name cannot be longer than 128 characters").isLength({max: 128})
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({success: false, msg: errors.array().map(x => ({msg: x.msg, field: x.path}))});
    }

    let username = req.body.username;
    let password = req.body.password;
    let name = req.body.name;

    try {

        let hash = await encryption.HashPassword(password);

        let usernameExistCheck = await knex("users").select("username").where({username: username.toLowerCase().trim()}).limit(1);
        if (usernameExistCheck[0]) {
            return res.status(400).json({success: false, msg: "This username is already in use"});
        }

        let newUser = await knex("users").insert({
            username: username.toLowerCase().trim(),
            display_name: username,
            name,
            password: hash
        }, "id");

        if (!newUser[0]) {
            return next(new Error("Failed to insert new user"));
        }

        return res.status(200).json({success: true, redirect: "/users/login?r_s=1"});

    } catch (e) {
        return next(e);
    }
})

router.post("/login", validation.ensureNotAuthenticated, passport.authenticate("local", {
    successMessage: true,
    failureMessage: true,
    failureRedirect: "/users/login",
    successRedirect: "/"
}))

router.get("/list", validation.ensureAuthenticated, async (req, res, next) => {
    try {
        let search = req.query.q;
        let limit = req.query.limit;
        let skip = req.query.skip;
        let exclude = req.query.exclude;
        let channel = req.query.channel;
        if (isNaN(limit) || limit < 0 || limit > 200) {
            limit = 50;
        }
        if (isNaN(skip) || skip < 0) {
            skip = 0;
        }
        if (exclude) {
            exclude = exclude.split(",");
        }

        if (channel) {
            let channelUsers = await knex("channel_members").where({channel})
                .innerJoin("users", "users.id", "=", "channel_members.user")
                .select("users.username");

            if (channelUsers.length > 0) {
                exclude = channelUsers.map(x => x.username);
            }
        }

        let userQuery = knex("users").limit(limit).offset(skip).select([
            "username", "display_name", "name", "created_at", "level", "asset_count"
            ]);

        if (exclude) {
            userQuery.whereNotIn("username", exclude);
        }

        if (search) {
            userQuery.whereILike("username", `%${search}%`).orWhereILike("name", `%${search}%`)
        }

        userQuery.then((users) => {
            return res.status(200).json({success: true, items: users.map(x => ({
                ...x,
                isCurrent: x.username == req.user.username
            })), reachedEnd: users.length < limit});
        }).catch(e => {
            return next(e);
        })
    } catch (e) {
        return next(e);
    }
})

module.exports = router;
