const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

const {body, validationResult} = require('express-validator');

const passport = require('passport');
const encryption = require('../modules/encryption');
const marked = require('../modules/marked');

const User = require('../models/user');
const Channel = require('../models/channel');
const logger = require('../modules/logger');
const assetFunctions = require('../modules/assetFunctions');

const userFunctions = require('../modules/userFunctions');
const validation = require('../modules/validation');

router.get('/', validation.ensureAuthenticated, (req, res, next) => {
    User.find({}).select("meta name safeName username mailHash createdAt").sort({username: 1}).exec((err, users) => {
        if (err) {
            return next(err);
        }
        res.render('users/index', {
            title: "Users",
            users
        })
    })
})

router.get('/login', csrfProtection, validation.ensureNotAuthenticated, (req, res) => {
    res.render('users/login', {
        title: "Login",
        csrfToken: req.csrfToken()
    })
})

router.post('/login', csrfProtection, validation.ensureNotAuthenticated, (req, res, next) => {
    passport.authenticate('local', {
        successRedirect:'/',
        failureRedirect:'/users/login',
        failureFlash: true
    })(req, res, next);
})

router.get("/logout", (req, res) => {
    req.logout();
    res.clearCookie("channel");
    res.redirect('/');
})

router.get('/register', csrfProtection, validation.ensureNotAuthenticated, (req, res) => {
    res.render('users/register', {
        title: "Register",
        csrfToken: req.csrfToken()
    })
})

router.post('/register', csrfProtection, validation.ensureNotAuthenticated, [
    body("name", "Name has to be between 1 and 128 characters").isLength({min: 1, max: 128}),
    body("username", "Username has to be between 3 and 128 characters").isLength({min: 3, max: 128}),
    body("email", "E-Mail address is invalid").isEmail(),
    body("password", "A valid password containing 4 to 256 characters is rqeuired").notEmpty().isLength({min: 4, max: 256}),
    body("about", "Your about text cannot be longer than 4096 characters").optional().isLength({max: 4096})
], async (/**@type {Request} */ req, /**@type {Response} */ res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/users/register');
        return;
    }

    let name = req.body.name;
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let about = req.body.about;

    let mailCount = await userFunctions.getMailCount(email);

    if (mailCount > 0) {
        req.flash('danger', "The given E-Mail address is already in use");
        res.redirect("/users/register");
        return;
    }

    let rendered_description = marked.markAndSanitize(about);

    let hashedPassword = await encryption.encryptPassword(password);
    if (!hashedPassword) {
        req.flash('danger', "Something went wrong. Please try again later. (0x0)");
        res.redirected('/users/register');
        return;
    }

    let newUser = new User({
        name,
        username,
        safeName: userFunctions.createSafeName(username),
        email,
        mailHash: encryption.md5Hash(email),
        password: hashedPassword,
        description: {
            raw: about,
            rendered: rendered_description
        }
    })

    newUser.save((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', "Successfully created your new account. You can now login.");
        res.redirect('/users/login');
    })
})

router.get('/v/:name', (req, res, next) => {
    let name = req.params.name;
    let query = {$or: [
        {username: name},
        {safeName: name}
    ]};

    User.findOne(query).select("name username safeName mailHash description createdAt meta").exec((err, user) => {
        if (err) {
            return next(err);
        }
        if (user) {
            let channelQuery = {$or: [
                {createdBy: user.id},
                {access: user.id}
            ]}

            if (!req.user || req.user.id != user.id) {
                channelQuery.public = true;
            }

            Channel.find(channelQuery).select("name thumbnails url meta").exec((err, channels) => {
                if (err) {
                    return next(err);
                }
                res.render('users/view', {
                    toView: user,
                    title: user.username,
                    channels
                })
            })
        } else {
            next({status: 404});
        }
    })
})

const settings = ["general", "email", "password", "preferences"]

router.get('/settings', validation.ensureAuthenticated, (req, res) => {
    res.redirect('/users/settings/'+settings[0]);
})

router.get('/settings/:setting', validation.ensureAuthenticated, (req, res, next) => {
    let setting = req.params.setting.toLowerCase();
    if (!settings.includes(setting)) {
        next({status: 404});
        return;
    }
    res.render("users/settings", {
        title: "Settings",
        settings,
        setting
    })
})

router.post("/settings/save/general", validation.ensureAuthenticated, [
    body("name", "Name has to be between 1 and 128 characters").isLength({min: 1, max: 128}),
    body("about", "Your about text cannot be longer than 4096 characters").optional().isLength({max: 4096}),
    body("username", "Username has to be between 3 and 128 characters").optional({checkFalsy: true}).isLength({min: 3, max: 128})
], async (req, res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/users/settings/general');
        return;
    }

    let name = req.body.name;
    let about = req.body.about;
    let username = req.body.username;

    let oldName = req.user.username;

    let rendered_description = marked.markAndSanitize(about);

    req.user.name = name;
    req.user.description = {
        raw: about,
        rendered: rendered_description
    }

    if (username && username != "" && username.trim() != req.user.username.trim()) {

        let canRename = true;
        if (req.user.meta.lastRename && req.user.meta.lastRename.when) {
            let diff = new Date().getTime() - req.user.meta.lastRename.when.getTime()
            diff = diff / 1000 / 60 / 60 / 24;
            if (diff < 30) {
                canRename = false;
            }
        }
        
        if (canRename) {
            req.user.username = username.trim();
            req.user.safeName = userFunctions.createSafeName(username);
            req.user.meta.lastRename = {
                when: new Date(),
                from: oldName,
                to: username
            }

            await assetFunctions.updateUsername(req.user.id, username.trim(), userFunctions.createSafeName(username));
        }
    }

    req.user.save((err) => {
        if (err) {
            return next(err);
        } else {
            req.flash('success', "Successfully saved changes");
        }
        res.redirect('/users/settings/general');
    })
})

router.get("/search", validation.ensureAuthenticated, (req, res) => {
    let query = req.query.q;
    if (!query) {
        return res.status(400).json({success: false});
    }

    User.find({$or: [
        {username: {$regex: query, $options: "i"}},
        {safeName: {$regex: query, $options: "i"}},
        {name: {$regex: query, $options: "i"}}
    ]}).limit(10).select("id username safeName").exec((err, users) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        return res.status(200).json({success: true, users});
    })
})

module.exports = router;