const ObjectId = require('mongoose').Types.ObjectId;

const isAuthorized = (req, res) => {
    return req.isAuthenticated() && req.user && req.user.meta.level === -1;
}

const ensureAuthorized = (req, res, next) => {
    if (isAuthorized(req, res)) {
        next();
    } else {
        res.status(403).send();
    }
}

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        return next();
    } else {
        req.flash('negative', "err.not_logged_in");
        res.redirect('/');
    }
}

const ensureNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    } else {
        req.flash('negative', "err.already_logged_in");
        res.redirect('/');
    }
}

const hasAccess = (level) => {
    return (req, res, next) => {
        if (req.user && req.user.meta.level.includes(level) || req.user.meta.level.includes(-1)) {
            return next();
        } else {
            req.flash('negative', "err.access_denied")
            res.redirect('/');
        }
    }
}

const isValidObjectId = (id) => {
    if (!id) {
        return false;
    }
    return ObjectId.isValid(id);
}

module.exports = {ensureAuthenticated, ensureNotAuthenticated, isAuthorized, isValidObjectId, hasAccess, ensureAuthorized}