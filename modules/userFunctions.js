const User = require('../models/user');
const logger = require('./logger');
const Channel = require('../models/channel');

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

module.exports = {createSafeName, getMailCount, getUsers};