const path = require('path');
const fs = require('fs');
const paths = require('./paths');
const logger = require('./logger');

let hints;
const hintPath = path.join(paths.res, "hints.json");
if (fs.existsSync(hintPath)) {
    try {
        hints = JSON.parse(fs.readFileSync(hintPath));
        logger.info("Loaded hints");
    } catch (e) {
        logger.error(e);
    }
}

const getHint = function() {
    if (!hints) {
        return;
    }
    return hints[Math.floor(Math.random()*hints.length)];
}

module.exports = {hints, getHint}