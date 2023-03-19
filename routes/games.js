const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { isValidObjectId } = require('mongoose');
const Game = require('../models/game');
const logger = require('../modules/logger');

const { markAndSanitize, sanitizeFull } = require('../modules/marked');

const steamGameHelper = require('../modules/steamGameHelper');

const { ensureAuthenticated } = require('../modules/validation');
const { sorts } = require('../modules/videoFunctions');

router.get('*', ensureAuthenticated, (req, res, next) => {
    next();
})

router.get("/", (req, res) => {
    Game.find().sort({"name": 1}).select("name header developers description.short").exec((err, games) => {
        if (err) {
            logger.error(err);
        }
        res.render('games/index', {
            title: "Games",
            games
        })
    })
})

router.get("/new", (req, res) => {
    res.render("games/new", {
        title: "New Game"
    })
})

router.post("/new", [
    body("name", "Game name is required").notEmpty(),
    body("name", "Name cannot be longer than 1024 characters").isLength({max: 1024}),
    body("headerImage", "Header image url cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("tags", "Tags cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("developers", "Developers cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("publishers", "Publishers cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("about", "Description cannot be longer than 4096 characters").isLength({max: 4096}).optional()
], (req, res, next) => {

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(err => {
            req.flash('danger', err.msg);
        })
        return res.redirect("/games/new");
    }

    let name = req.body.name;
    let headerImage = req.body.headerImage;
    let tags = req.body.tags;
    let description = req.body.about;
    let developers = req.body.developers;
    let publishers = req.body.publishers;

    let rendered, short;

    if (description) {
        rendered = markAndSanitize(description);
        let stripped = sanitizeFull(rendered);
        if (stripped.length > 512) {
            short = stripped.substring(0, 512) + "...";
        } else {
            short = stripped;
        }
    }


    if (tags) {
        tags = tags.split(", ");
        if (!Array.isArray(tags)) {
            tags = [tags];
        }
        tags = tags.map(x => {return {description: x}})

    }
    if (developers) {
        developers = developers.split(", ");
        if (!Array.isArray(developers)) {
            developers = [developers];
        }
    }
    if (publishers) {
        publishers = publishers.split(", ");
        if (!Array.isArray(publishers)) {
            publishers = [publishers];
        }
    }

    let newGame = new Game({
        name,
        header: headerImage,
        categories: tags,
        description: {
            detailed: rendered,
            short
        },
        developers,
        publishers,
        rawDescription: req.body.about,
        meta: {
            addedBy: req.user.id,
            lastUpdate: new Date(),
            isCustom: true
        }
    })

    newGame.save((err, game) => {
        if (err) {
            return next(err);
        }
        req.flash('success', "Successfully created a custom game");
        return res.redirect("/games/v/"+game._id);
    })

})

router.post("/edit/:id", [
    body("name", "Game name is required").notEmpty(),
    body("name", "Name cannot be longer than 1024 characters").isLength({max: 1024}),
    body("headerImage", "Header image url cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("tags", "Tags cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("developers", "Developers cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("publishers", "Publishers cannot be longer than 2048 characters").isLength({max: 2048}).optional(),
    body("about", "Description cannot be longer than 4096 characters").isLength({max: 4096}).optional()
], (req, res, next) => {

    let id = req.params.id;
    if (!isValidObjectId(id)) {
        req.flash('danger', "Invalid ID");
        return res.redirect("/games");
    }

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(err => {
            req.flash('danger', err.msg);
        })
        return res.redirect("/games/new");
    }

    let name = req.body.name;
    let headerImage = req.body.headerImage;
    let tags = req.body.tags;
    let description = req.body.about;
    let developers = req.body.developers;
    let publishers = req.body.publishers;

    let rendered, short;

    if (description) {
        rendered = markAndSanitize(description);
        let stripped = sanitizeFull(rendered);
        if (stripped.length > 512) {
            short = stripped.substring(0, 512) + "...";
        } else {
            short = stripped;
        }
    }


    if (tags) {
        tags = tags.split(", ");
        if (!Array.isArray(tags)) {
            tags = [tags];
        }
        tags = tags.map(x => {return {description: x}})

    }
    if (developers) {
        developers = developers.split(", ");
        if (!Array.isArray(developers)) {
            developers = [developers];
        }
    }
    if (publishers) {
        publishers = publishers.split(", ");
        if (!Array.isArray(publishers)) {
            publishers = [publishers];
        }
    }

    Game.findByIdAndUpdate(id, {
        $set: {
            name,
            header: headerImage,
            categories: tags,
            description: {
                detailed: rendered,
                short
            },
            developers,
            publishers,
            rawDescription: req.body.about,
            meta: {
                lastUpdate: new Date(),
                isCustom: true,
                addedBy: req.user.id
            }
        }
    }).exec((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', "Successfully saved game settings");
        return res.redirect("/games/v/"+encodeURIComponent(id));
    })

})

router.get("/edit/:id", (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        req.flash('danger', "Invalid ID");
        return res.redirect("/games");
    }

    Game.findById(id).exec((err, game) => {
        if (err) {
            return next(err);
        }
        if (!game) {
            return next();
        }
        res.render("games/edit", {
            title: "Edit game",
            game
        })
    })
})

router.get('/v/:id', (req, res) => {
    Game.findById(req.params.id).populate("meta.addedBy", "username name safeName id").exec((err, game) => {
        if (err) {
            logger.error(err);
        }
        if (game) {
            res.render('games/view', {
                game,
                title: game.name,
                sorts: sorts
            })
        } else {
            req.flash('danger', "Game not found");
            res.redirect('/games');
        }
    })
})

router.get('/v/:id/images', (req, res) => {
    Game.findById(req.params.id).exec((err, game) => {
        if (err) {
            logger.error(err);
        }
        if (game) {
            res.render('games/images', {
                game,
                title: game.name
            })
        } else {
            req.flash('danger', "Game not found");
            res.redirect('/games');
        }
    })
})

router.get('/v/:id/videos', (req, res) => {
    Game.findById(req.params.id).exec((err, game) => {
        if (err) {
            logger.error(err);
        }
        if (game) {
            res.render('games/videos', {
                game,
                title: game.name
            })
        } else {
            req.flash('danger', "Game not found");
            res.redirect('/games');
        }
    })
})

router.post('/add', [
    body("id", "Id is invalid").isNumeric()
], async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash('danger', e.msg);
        })
        res.redirect('/games');
        return;
    }
    let id = req.body.id;
    let data = await steamGameHelper.getAndCreate(id, req);
    if (data.success === true) {
        req.flash('success', "Successfully added game");
    } else {
        logger.error(data);
        req.flash('danger', "Something went wrong...");    
    }
    res.redirect("/games");
})

router.post('/update', async (req, res) => {
    let id = req.body.id;
    let data = await steamGameHelper.updateGameInfo(id, req);
    res.status(200).json(data);
})

module.exports = router;