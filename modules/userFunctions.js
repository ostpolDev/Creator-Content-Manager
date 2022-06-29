const User = require('../models/user');
const logger = require('./logger');
const Channel = require('../models/channel');
const { isValidObjectId } = require('mongoose');

const createSafeName = function(/**@type {String} */ name) {
    name = name.replace(/\W/gi, "_");
    return name.toLowerCase();
}

const getMailCount = function(mail) {
    return new Promise((res) => {
        User.countDocuments({email: mail}).exec((err, count) => {
            if (err) {
                logger.error(err);
                return res(-1);
            }
            return res(count);
        })
    })
}

const getUsers = function(ids, select) {
    return new Promise((res) => {
        if (!ids) {
            return res({success: true, users: []});
        }
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        User.find({_id: {$in: ids}}).select(select).exec((err, users) => {
            if (err) {
                logger.error(err);
                return res({success: false, error: err});
            }
            return res({success: true, users})
        })
    })
}

const userExists = function(id) {
    return new Promise((res) => {
        if (!isValidObjectId(id)) {
            return res(false);
        }

        User.countDocuments({_id: id}).exec((err, count) => {
            if (err) {
                logger.error(err);
                return res(false);
            }
            return res(count > 0);
        })
    })
}

const getInfoForUser = function(name, fields) {
    return new Promise((res) => {
        User.findOne({$or: [{safeName: name}, {username: name}]}).select(fields).exec((err, user) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            return res(user);
        })
    })
}

const updateAssetCount = function(id, count) {
    return new Promise((res) => {
        User.findOneAndUpdate({_id: id}, {$inc: {"meta.assetCount": count}}).exec((err) => {
            if (err) {
                logger.error(err);
                return res(false);
            }
            return res(true);
        })
    })
}

const modifyFavorite = function(userId, assetId, type) {
    return new Promise((res) => {
        User.findById(userId).select("favorites").exec((err, user) => {
            if (err) {
                logger.error(err);
                return res(false);
            }
            let index = user.favorites.indexOf(assetId);
            if (type == "add") {
                if (index === -1) {
                    user.favorites.push(assetId);
                } else {
                    return res(true);
                }
            } else if (type == "remove") {
                if (index !== -1) {
                    user.favorites.splice(index, 1);
                } else {
                    return res(true);
                }
            }

            user.save((err) => {
                if (err) {
                    logger.error(err);
                    return res(false);
                }
                return res(true);
            })
        })
    })
}

module.exports = {createSafeName, getMailCount, getUsers, userExists, getInfoForUser, updateAssetCount, modifyFavorite};