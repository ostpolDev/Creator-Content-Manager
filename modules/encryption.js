const bcrypt = require('bcryptjs');
const md5 = require('md5');

const logger = require('./logger')

const encryptPassword = function(password) {
    return new Promise((res) => {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                logger.error(err);
                return res();
            }
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) {
                    if (err) {
                        logger.error(err);
                        return res();
                    }
                } else {
                    return res(hash);
                }
            })
        })
    })
}

const md5Hash = function(input) {
    return md5(input);
}

module.exports = {encryptPassword, md5Hash}