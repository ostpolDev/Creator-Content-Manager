const Asset = require("../models/asset");
const Batch = require('../models/batch');
const Meta = require('../models/meta');

const fileUpload = require('express-fileupload');
const uuid = require('uuid').v4;
const getMetaData = require('metadata-scraper');
const userFunctions = require('./userFunctions');

const logger = require('../modules/logger');
const paths = require('../modules/paths');
const path = require("path");
const fs = require('fs');
const marked = require("../modules/marked");
const { isValidObjectId } = require("mongoose");

const commonToReplace = ["y2matecom", "redditsavecom", "y2mate.com", "redditsave.com", "[Mpgun.com]", "[mpgun.com]", "Mpgun.com", "mpgun.com"];

const fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp", ".ogg", ".jpeg", ".pdn", ".wav", ".txt", ".md"];
const assetTypes = ["music", "soundEffect", "video", "image", "text"];
const licenceTypes = {
    "None": {},
    "Attribution": {url: "https://creativecommons.org/licenses/by/4.0", icon: "https://licensebuttons.net/l/by/3.0/88x31.png"},
    "Attribution-ShareAlike": {url: "https://creativecommons.org/licenses/by-sa/4.0", icon: "https://licensebuttons.net/l/by-sa/3.0/88x31.png"},
    "Attribution-NoDerivs": {url: "https://creativecommons.org/licenses/by-nd/4.0", icon: "https://licensebuttons.net/l/by-nd/3.0/88x31.png"},
    "Attribution-NonCommercial": {url: "https://creativecommons.org/licenses/by-nc/4.0", icon: "https://licensebuttons.net/l/by-nc/3.0/88x31.png"},
    "Attribution-NonCommercial-ShareAlike": {url: "https://creativecommons.org/licenses/by-nc-sa/4.0", icon: "https://licensebuttons.net/l/by-nc-sa/3.0/88x31.png"},
    "Attribution-NonCommercial-NoDerivs": {url: "https://creativecommons.org/licenses/by-nc-nd/4.0", icon: "https://licensebuttons.net/l/by-nc-nd/3.0/88x31.png"},
    "CC0": {url: "https://creativecommons.org/publicdomain/zero/1.0/", icon: "https://i.creativecommons.org/p/zero/1.0/88x31.png"}
}

const sorts = {
    "name": "name",
    "added date": "createdAt",
    "clean name": "cleanName",
    "unique id": "uuid",
    "size": "size",
    "type": "assetType",
    "file type": "mimetype",
    "extention": "extention",
    "original name": "originalName",
    "batch size": "batchSize"
}

const handleFiles = function(req) {
    return new Promise(async (res) => {

        let files = req.files.assets;
        if (!Array.isArray(files)) {
            files = [files];
        }

        let name = req.body.name.trim();
        let batchName = req.body.batchName;
        let about = req.body.about;
        let legalInfo = req.body.legalInfo;
        let assetType = req.body.assetType;
        let tags = req.body.tags;
        let source = req.body.source;
        let price = req.body.price;
        let licence = req.body.licence;
        let nsfw = req.body.nsfw != undefined;

        let canUseVideos = req.body.videos != undefined;
        let canUseStreaming = req.body.streaming != undefined;

        let isPurchased = false;
        if (!isNaN(price) && price > 0.0) {
            isPurchased = true;
        }

        if (!assetTypes.includes(assetType)) {
            return res({success: false, msg: "Invalid asset type"});
        }

        if (licence && licence != "undefined" && licence != undefined) {
            if (!Object.keys(licenceTypes).includes(licence)) {
                return res({success: false, msg: "Invalid licence"});
            }
        }
        
        let batch = await makeBatch(req.user.id, batchName);
        if (!batch) {
            return res({success:false, msg: "Failed to create batch"});
        }

        if (!batch.skipped) {
            batch.skipped = [];
        }
        
        if (source) {
            try {
                await makeMeta(source, batch.id);
            } catch (e) {
                logger.error(e);
                return res({success: false, msg: "Could not get meta information"});
            }
        }

        let skipped = 0;
        let skippedSize = 0;
        let totalSize = 0;

        let currentIndex = 0;

        let start = new Date();

        function handleFile() {

            /**@type {fileUpload.UploadedFile} */ 
            let file = files[currentIndex];

            let uid = uuid();
            let extention = path.extname(file.name);
            let destinationPath = path.join(paths.upload, uid + extention);

            file.mv(destinationPath, (/**@type {Error} */ err) => {
                if (err) {
                    logger.error(err);
                    batch.skipped.push({
                        name: file.name,
                        reason: "Failed to move the file",
                        size: file.size,
                        mimetype: file.mimetype,
                        extention,
                        admin: {
                            error_message: err.msg || err.message,
                            error_stack: err.stack,
                            error_name: err.name
                        }
                    })
                    skipped += 1;
                    skippedSize += file.size;
                    next();
                } else { // The file is now on the server...

                    let newAsset = new Asset({
                        name: name || file.name,
                        cleanName: cleanName(file.name),
                        uuid: uid,
                        description: {
                            raw: about,
                            rendered: marked.markAndSanitize(about)
                        },
                        size: file.size,
                        mimetype: file.mimetype,
                        extention,
                        originalName: file.name,
                        createdBy: req.user.id,
                        batch: batch.id,
                        batchSize: files.length,
                        assetType,
                        legalInfo,
                        licence: licence,
                        source,
                        tags: tags.split(","),
                        tagsString: tags,
                        unsafe: false,
                        meta: {
                            downloads: 0,
                            hasCustomName: name != "",
                            uploadedBy: {
                                username: req.user.username,
                                safeName: req.user.safeName
                            }
                        },
                        nsfw,
                        allowedPlatforms: {
                            videos: canUseVideos,
                            streams: canUseStreaming
                        }
                    })

                    newAsset.save((err) => {
                        if (err) {
                            logger.error(err);
                            batch.skipped.push({
                                name: file.name,
                                reason: "Failed to save the file to the database",
                                size: file.size,
                                mimetype: file.mimetype,
                                extention,
                                admin: {
                                    error_message: err.msg || err.message,
                                    error_stack: err.stack,
                                    error_name: err.name
                                }
                            })
                            skipped += 1;
                            skippedSize += file.size;

                            fs.unlinkSync(destinationPath);
                        } else {
                            totalSize += file.size;
                        }
                        next();
                    })

                }
            })
            
            function next() {
                currentIndex += 1;
                if (currentIndex >= files.length) {
                    done();
                } else {
                    handleFile();
                }
            }

        }

        async function done() {
            let end = new Date();

            batch.skippedCount = skipped;
            batch.length = files.length - skipped;
            batch.attemptedLength = files.length;
            batch.fileSize = totalSize;
            batch.attemptedFileSize = totalSize + skippedSize;
            batch.missedFileSize = skippedSize;
            batch.uploadTime = {
                start,
                end,
                time: end.getTime() - start.getTime()
            }

            batch.purchase = {
                isPurchased,
                price,
                purchasedBy: req.user.id
            }

            await userFunctions.updateAssetCount(req.user.id, files.length - skipped);

            batch.save((err, _batch) => {
                if (err) {
                    logger.error(err);
                    // TODO: Delete all files that were uploaded;
                    return res({success: false, msg: "Failed to create the batch"})
                }
                return res({success: true, batchId: _batch.id});
            })

        }

        handleFile();

    })
}

const makeBatch = function(userId, name) {
    return new Promise((res) => {
        let newBatch = new Batch({
            createdBy: userId,
            name: name || uuid()
        })

        newBatch.save((err, batch) => {
            if (err) {
                logger.error(err);
                return res();
            }
            return res(batch);
        })
    })
}

const makeMeta = function(url, batchId) {
    return new Promise(async (res) => {
        try {
            let start = new Date();
            let metaData = await getMetaData(url);
            if (!metaData) {
                return res();
            }
            let uid = uuid();
            let metaPath = path.join(paths.meta, uid + ".json");
            fs.writeFile(metaPath, JSON.stringify(metaData), (err) => {
                if (err) {
                    logger.error(err);
                    return res();
                }
    
                fs.stat(metaPath, (err, stats) => {
                    if (err) {
                        logger.error(err);
                        return res();
                    }
    
                    let end = new Date();
                    
                    let newMeta = new Meta({
                        batch: batchId,
                        url,
                        uuid: uid,
                        requestInfo: {
                            lastRequest: start,
                            start,
                            end,
                            time: end.getTime() - start.getTime()
                        },
                        size: stats.size
                    })
    
                    newMeta.save((err, meta) => {
                        if (err) {
                            logger.error(err);
                            return res();
                        }
                        return res(meta);
                    })
                })
            })

        } catch (e) {
            logger.error(e);
            return res();
        }

    })
}

const cleanName = function(name) {
    if (!name) {
        return "";
    }
    commonToReplace.forEach(c => {
        name = name.replace(c, "");
    })

    let re = new RegExp(path.extname(name), "gi");


    name = name.replace(/_/g, " ");
    name = name.replace(re, "");
    name = name.replace(/^[_\.\*]/g, " ");
    name = name.trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return name;
}

function formatCamelCase(text) {
    const result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

const getList = function(req) {
    return new Promise(async (res) => {
        let currentSort = req.query.sort;
        let currentOrder = req.query.order;
        let currentQuery = req.query.q;
        let searchQuery = req.query.query;

        let batch = req.query.batch;

        let skip = req.query.skip;
        let limit = req.query.limit;

        let favUser = req.query.favUser;
        let user = req.query.user;
        let type = req.query.type;
        let extention = req.query.extention;

        let allowedVideos = makeBoolean(req.query.videos);
        let allowedStreams = makeBoolean(req.query.streams);

        try {
            if (skip) {
                skip = parseInt(skip);
            } else {
                skip = 0;
            }

            if (limit) {
                limit = parseInt(limit);
            } else {
                limit = 20;
            }

            if (limit > 50) {
                limit = 50;
            }
        } catch (e) {
            logger.error(e);
            return res({success: false, msg: "Invalid parameters"});
        }
    
        if (!currentSort || !Object.keys(sorts).includes(currentSort)) {
            currentSort = "added date";
        } else {
            currentSort = currentSort.toLowerCase()
        }
    
        if (!currentOrder || (currentOrder != "1" && currentOrder != "-1")) {
            currentOrder = "-1";
        }
    
        currentOrder = parseInt(currentOrder);
    
        let assetQuery = {};

        if (searchQuery && searchQuery.trim() != "") {
            assetQuery.$or = [
                {name: {$regex: searchQuery, $options: "i"}},
                {cleanName: {$regex: searchQuery, $options: "i"}},
                {"description.raw": {$regex: searchQuery, $options: "i"}},
                {uuid: {$regex: searchQuery, $options: "i"}},
                {tags: {$regex: searchQuery, $options: "i"}}
            ]
        }

        if (allowedVideos !== undefined) {
            assetQuery["allowedPlatforms.videos"] = true;
        }

        if (allowedStreams !== undefined) {
            assetQuery["allowedPlatforms.streams"] = true;
        }

        if (isValidObjectId(batch)) {
            assetQuery.batch = batch;
        }
    
        if (favUser) {
            let favorites = await userFunctions.getFavorites(favUser);
            if (favorites === undefined) {
                return res({success: false, msg: "Could not find favorites of user"});
            }
            assetQuery._id = {$in: favorites};
        }

        if (user) {
            user = await userFunctions.getInfoForUser(user, "_id username safeName");
            if (!user) {
                return res({success: false, msg: "Could not find user"});
            }
            assetQuery.createdBy = user._id;
        }

        if (type && assetTypes.includes(type)) {
            assetQuery.assetType = type;
        }

        if (extention && fileTypes.includes(extention)) {
            assetQuery.extention = extention;
        }
    
        let assetSort = {}
    
        let field = sorts[currentSort];
    
        assetSort[field] = currentOrder;
    
        let selects = ["name", "cleanName", "fileType", "mimetype", "createdBy", "meta", "createdAt", "tags", "extention", "tagsString"];
        if (!field.startsWith("meta") && !selects.includes(field)) {
            selects.push(field);
        }
    
        Asset.find(assetQuery).sort(assetSort).select(selects.join(" ")).limit(limit).sort({createdAt: -1}).skip(skip).exec((_err, assets) => {
            if (_err) {
                return next(_err);
            }
            let params = {
                currentSort,
                currentOrder,
                currentQuery,
                field,
                assetQuery,
                assetSort,
                limit,
                skip
            }
            return res({success: true, params, assets})
        })
    })
}

const deleteFile = function(asset) {
    if (!asset) {
        return false;
    }
    let filePath = path.join(paths.upload, asset.uuid + asset.extention);
    if (!fs.existsSync(filePath)) {
        return false;
    }
    fs.unlinkSync(filePath);
    return true;
}

const deleteMetaFile = function(meta) {
    if (!meta) {
        return false;
    }
    let filePath = path.join(paths.meta, meta.uuid + ".json");
    if (!fs.existsSync(filePath)) {
        return false;
    }
    fs.unlinkSync(filePath);
    return true;
}


const makeBoolean = function(string) {
    if (!string) {
        return undefined;
    }
    if (string == "true") {
        return true;
    } else if (string == "false") {
        return false;
    } else {
        return undefined;
    }
}

const updateDownloadCount = function(assetId) {
    return new Promise((res) => {
        Asset.findOneAndUpdate({_id: assetId}, {$inc: {"meta.downloads": 1}}).exec((err) => {
            if (err) {
                logger.error(err);
                return res(false);
            }
            return res(true);
        })
    })
}

const deleteManyFiles = function(assets) {
    assets.forEach(a => {
        let filePath = path.join(paths.upload, a.uuid + a.extention);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    })
}

const updateUsername = function(userId, username, safeName) {
    return new Promise((res) => {
        if (!isValidObjectId(userId)) {
            return res(undefined);
        }

        Asset.updateMany({createdBy: userId}, {$set: {"meta.uploadedBy.username": username, "meta.uploadedBy.safeName": safeName}}).exec((err) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            return res(true);
        })
    })
}

const assetExists = function(id) {
    return new Promise((res) => {
        if (!isValidObjectId(id)) {
            return res(false);
        }

        Asset.countDocuments({_id: id}).exec((err, count) => {
            if (err) {
                logger.error(err);
                return res(false);
            }
            return res(count > 0);
        })
    })
}

module.exports = {handleFiles, makeBatch, makeMeta, cleanName, assetExists, makeBoolean, fileTypes, assetTypes, licenceTypes, getList, sorts, updateDownloadCount, deleteFile, deleteMetaFile, deleteManyFiles, updateUsername}