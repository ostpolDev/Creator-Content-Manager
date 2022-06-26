const logger = require('../modules/logger');
const youtube = require('../modules/youtube');
const userFunctions = require('../modules/userFunctions');

const Channel = require('../models/channel');
const User = require('../models/user');
const { isValidObjectId } = require('mongoose');

const getChannelCount = function(id) {
    return new Promise((res) => {
        Channel.countDocuments({youtubeId: id}).exec((err, count) => {
            if (err) {
                logger.error(err);
                return res(-1);
            }
            return res(count);
        })
    })
}

const createFromId = function(id, checkExistence) {
    return new Promise(async (res) => {
        let start = new Date();


        if (checkExistence) {
            let youtubeCount = await getChannelCount(id);
            if (youtubeCount > 0) {
                return res({success: false, msg: "This channel already exists.", alreadyExists: true});
            }
        }

        let channelInfo = await youtube.getChannelInfo(encodeURIComponent(id));

        if (!channelInfo || !channelInfo.items) {
            return res({success: false, msg: "The channel was not found"});
        }
    
        let item = channelInfo.items[0];
        if (!item) {
            return res({success: false, msg: "The channel was not found"});
        }
    
        let end = new Date();
    
        let snippet = item.snippet;
        let stats = item.statistics;
        let status = item.status;
    
        let newChannel = new Channel({
            createdBy: req.user.id,
            name: snippet.title,
            thumbnails: snippet.thumbnails,
            youtubeId: item.id,
            url: `https://www.youtube.com/channel/${item.id}`,
            description: snippet.localized.description,
            meta: {
                requestInfo: {
                    lastRequest: start,
                    start,
                    end,
                    time: end.getTime() - start.getTime()
                }
            },
            statistics: stats,
            status
        })

        newChannel.save((err, channel) => {
            if (err) {
                logger.error(err);
                return res({success: false, error: err, msg: "Something went wrong. Please try again later..."});
            }
            return res({success: true, channel});
        })
    })
}

const hasAccessToChannel = function(channelId, userId) {
    return new Promise((res) => {
        Channel.findOne({_id: channelId, $or: [
            {createdBy: userId},
            {access: userId}
        ]}).exec((err, channel) => {
            if (err) {
                logger.error(err);
                return res({success: false, error: err});
            }
            if (!channel) {
                return res({success: true, hasAccess: false});
            }
            return res({success: true, hasAccess: true});
        })
    })
}

module.exports = {getChannelCount, createFromId, hasAccessToChannel};