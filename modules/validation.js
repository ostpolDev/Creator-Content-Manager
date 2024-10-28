const { knex } = require("./database");
const logger = require("./logger");

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        return next();
    } else {
        if (req.url.startsWith("/api")) {
            return res.status(403).json({success: false, msg: "You need to be logged in to view this page"});
        } else {
            req.session.messages = ["You need to be logged in to view this page"];
            return res.redirect("/");
        }
    }
}

const ensureNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    } else {
        if (req.url.startsWith("/api")) {
            return res.status(403).json({success: false, msg: "You are already logged in"});
        } else {
            req.session.messages = ["You are already logged in"];
            return res.redirect("/");
        }
    }
}

/**
 * 
 * @param {*} user 
 * @param {string} id 
 * @param {[string]?} selects 
 */
async function HasAccessToAsset(user, id, selects) {
    try {
        if (!selects) {
            selects = [];
        }
        let fields = ["id", "added_by", ...selects];
        let assetCheck = await knex("assets").where({id}).select(fields).limit(1);
        if (!assetCheck[0]) {
            return false;
        }
        return assetCheck[0].added_by == user.id || user.level == -1 ? assetCheck[0] : false;
    } catch (e) {
        logger.error(e);
        return false;
    }
}

module.exports = { ensureAuthenticated, ensureNotAuthenticated, HasAccessToAsset }
