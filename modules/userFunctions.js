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

module.exports = {createSafeName, getMailCount};