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

const createFromId = function(id, checkExistence, req) {
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
                    time: end.getTime() - start.getTime(),
                    by: req.user.id
                }
            },
            statistics: stats,
            status,
            customUrl: snippet.customUrl,
            publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : undefined,
            country: snippet.country
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

const updateChannel = function(id, req) {
    return new Promise(async (res) => {

        let start = new Date();

        Channel.findOne({_id: id, $or: [
            {createdBy: req.user.id},
            {access: req.user.id}
        ]}).exec(async (err, channel) => {
            if (err) {
                logger.error(err);
                return res({success: false, error: err, msg: "Something went wrong"});
            }
            if (!channel) {
                return res({success: false, msg: "No channel found"});
            }
    
            let lastUpdateDiff = new Date().getTime() - channel.meta.requestInfo.lastRequest.getTime()
            let diffHours = lastUpdateDiff / 3.6e+6;
            let canUpdate = diffHours >= 12;
    
            if (!canUpdate) {
                return res({success: false, msg: "Cannot update yet. Please try again later."});
            }

            let channelInfo = await youtube.getChannelInfo(encodeURIComponent(channel.youtubeId));

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

            channel.name = snippet.title;
            channel.thumbnails = snippet.thumbnails;
            channel.description = snippet.localized.description;
            channel.statistics = stats;
            channel.status = status;
            channel.customUrl = snippet.customUrl;
            channel.publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : undefined;
            channel.country = snippet.country;

            channel.meta.requestInfo = {
                lastRequest: start,
                start,
                end,
                time: end.getTime() - start.getTime(),
                by: req.user.id
            }

            channel.save((err, channel) => {
                if (err) {
                    logger.error(err);
                    return res({success: false, error: err, msg: "Something went wrong. Please try again later..."});
                }
                return res({success: true, channel});
            })
            
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
            return res({success: true, hasAccess: true, channel});
        })
    })
}

const getChannelIds = function(userId) {
    return new Promise((res) => {
        Channel.find({$or: [
            {createdBy: userId},
            {access: userId}
        ]}).select("name _id").exec((err, channels) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            let channelIds = channels.map(x => x.id);
            return res(channelIds);
        })
    })
}

const getChannel = function(id, userId) {
    return new Promise((res) => {
        Channel.findOne({_id: id, $or: [
            {createdBy: userId},
            {access: userId}
        ]}).select("name _id").exec((err, channel) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            return res(channel);
        })
    })
}

module.exports = {getChannelCount, createFromId, hasAccessToChannel, updateChannel, getChannelIds, getChannel};