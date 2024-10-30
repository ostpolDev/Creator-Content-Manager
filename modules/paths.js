const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const ROOT = path.join(__dirname, "..");
const public = path.join(ROOT, "public");
const res = path.join(public, "res");
const uploads = path.join(ROOT, "uploads");
const covers = path.join(uploads, "covers");
const tmp = path.join(ROOT, "tmp");
const resources = path.join(uploads, "resources");

const CREATE_IF_MISSING = [res, uploads, covers, tmp, resources];
CREATE_IF_MISSING.forEach(dir => {
    if (!fs.existsSync(dir)) {
        logger.info(`Creating directory: ${dir}`);
        fs.mkdirSync(dir);
    }
})

/**
 * 
 * @param {string} name 
 * @returns 
 */
function MakeSafe(name) {
    if (!name) {
        return null;
    }
    return name.replace(/[^\w\-_]/gi, "");
}

function MakeSafeFile(name) {
    if (!name) {
        return null;
    }
    return name.replace(/[\<\>:"\/\\|\?\*]/gi, "_");
}

module.exports = {
    ROOT,
    public,
    res,
    uploads,
    covers,
    tmp,
    MakeSafe,
    MakeSafeFile
}
