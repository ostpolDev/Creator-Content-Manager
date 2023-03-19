const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Game = require('../models/game');
const logger = require('../modules/logger');

const steamGameHelper = require('../modules/steamGameHelper');

const { ensureAuthenticated } = require('../modules/validation');
const { sorts } = require('../modules/videoFunctions');

router.get('*', ensureAuthenticated, (req, res, next) => {
    next();
})

router.get("/", (req, res) => {
    Game.find().sort({"name": 1}).select("name header developers").exec((err, games) => {
        if (err) {
            logger.error(err);
        }
        res.render('games/index', {
            title: "Games",
            games
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