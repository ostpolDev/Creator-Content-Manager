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
        req.flash('error', "You need to be logged in to view this page");
        res.redirect('/');
    }
}

const ensureNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', "This cannot be done while logged in");
        res.redirect('/');
    }
}

const hasAccess = (level) => {
    return (req, res, next) => {
        if (req.user && req.user.meta.level.includes(level) || req.user.meta.level.includes(-1)) {
            return next();
        } else {
            req.flash('error', "Access denied")
            res.redirect('/');
        }
    }
}

const ensureChannel = (req, res, next) => {
    if (res.locals.channel !== undefined && res.locals.channel._id !== undefined) {
        return next();
    } else {
        req.flash('error', "Channel required");
        res.redirect('/');
    }
}

const isValidObjectId = (id) => {
    if (!id) {
        return false;
    }
    return ObjectId.isValid(id);
}

module.exports = {ensureChannel, ensureAuthenticated, ensureNotAuthenticated, isAuthorized, isValidObjectId, hasAccess, ensureAuthorized}