const zlib = require("node:zlib");
const sanitize = require("sanitize-filename");
const logger = require("./logger");
const { knex } = require("./database");

function CompressString(input, force) {
    if (!input) {
        return undefined;
    }
    if (input.length > 1000 || force === true) {
        return {
            text: knex.raw("?", [zlib.deflateSync(input)]),
            compression: "gzip"
        }
    } else {
        return {
            text: input,
            compression: "none"
        }
    }
}

function UnzipString(input, compression) {
    if (!input) {
        return undefined;
    }
    if (!compression) {
        compression = "none";
    }
    switch (compression) {
        case "none":
            return Buffer.from(input, "binary").toString("utf8");
        case "gzip":
            if (!(input instanceof Buffer)) {
                input = Buffer.from(input, "binary");
            }
            
            return zlib.inflateSync(input).toString("utf8");
        default:
            logger.error(`Invalid compression type: ${compression}`);
            return input;
    }
}

/**
 * 
 * @param {string} name 
 */
function RemoveExtension(name) {
    if (!name) {
        return null;
    }
    return name.split(".").reverse().splice(1).reverse().join(".");
}

function FormatFileName(name) {
    return sanitize(name);
}

function ParseYouTubeTags(tagString) {
    if (!tagString || typeof tagString != "string") {
        return undefined;
    }
    
    let tags = [];
    let parts = tagString.split(" ");
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith('"')) {
            let subTag = [];
            subTag.push(parts[i].substring(1));
            i++;
            while (!parts[i].endsWith('"')) {
                subTag.push(parts[i]);
                i++;
            }
            subTag.push(parts[i].substring(0, parts[i].length - 1));
            tags.push(subTag.join(" "));
        } else {
            tags.push(parts[i]);
        }
    }
    return tags;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeString(string) {
    if (!string) {
        return "";
    }
    const result = string.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function bytesToSize(bytes) {
    if (!bytes) {
        return "--"
    }
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

module.exports = { CompressString, UnzipString, RemoveExtension, FormatFileName, ParseYouTubeTags, escapeRegExp, capitalizeString, bytesToSize }
