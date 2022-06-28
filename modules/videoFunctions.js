const logger = require("./logger");
const uuid = require('uuid').v4;

const Video = require('../models/video');
const youtube = require('./youtube');
const userFunctions = require('./userFunctions');
const channelFunctions = require('./channelFunctions');
const { isValidObjectId } = require("mongoose");

const categories = ['', 'Film & Animation', 'Autos & Vehicles', '', '', '', '', '', '', '', 'Music', '', '', '', '', 'Pets & Animals', '', 'Sports', 'Short Movies', 'Travel & Events', 'Gaming', 'Videoblogging', 'People & Blogs', 'Comedy', 'Entertainment', 'News & Politics', 'Howto & Style', 'Education', 'Science & Technology', 'Nonprofits & Activism', 'Movies', 'Anime/Animation', 'Action/Adventure', 'Classics', 'Comedy', 'Documentary', 'Drama', 'Family', 'Foreign', 'Horror', 'Sci-Fi/Fantasy', 'Thriller', 'Shorts', 'Shows', 'Trailers']

const sorts = {
    "title": "title",
    "upload date": "meta.publishedAt",
    "added date": "createdAt",
    "views": "statistics.viewCount",
    "likes": "statistics.likeCount",
    "comments": "statistics.commentCount",
    "category": "categoryId",
    "privacy ptatus": "status.privacyStatus",
    "made for kids": "status.madeForKids",
    "licence": "status.licence",
    "youTube id": "youtubeId"
}

const getCategory = function(index) {
    try {
        index = parseInt(index);
        if (index < 0 || index >= categories.length) {
            return "";
        }
        return categories[index];
    } catch (e) {
        logger.error(e);
        return "";
    }
}

const createVideo = function(youtubeId, channel, req) {
    return new Promise(async (res) => {

        let start = new Date();

        let editor = req.body.editor;
        let starring = req.body.starring;
        let title = req.body.title;

        let editorString, starringString;
        if (editor) {
            let editorResponse = await userFunctions.getUsers(editor, "username");
            if (editorResponse.users) {
                let editorNameArray = editorResponse.users.map(x => x.username);
                editorString = editorNameArray.join(", ");
            }
        }

        if (starring) {
            let starringResponse = await userFunctions.getUsers(starring, "username");
            if (starringResponse.users) {
                let starringNameArray = starringResponse.users.map(x => x.username);
                starringString = starringNameArray.join(", ");
            }
        }

        let newVideo = new Video({
            createdBy: req.user.id,
            channel: channel.id,
            title: title || uuid(),
            editor,
            starring: starring,
            meta: {
                editorsString: editorString,
                starringString
            }
        })
    
        if (!youtubeId) {
            newVideo.isEmpty = true;
            newVideo.save((err, video) => {
                if (err) {
                    logger.error(err);
                    return res({success: false, error: err, msg: "Something went wrong"});
                }
                return res({success: true, msg: "Successfully created a placeholder video", video});
            })
        } else {
            let videoInfo = await youtube.getVideoInfo(youtubeId);
            if (!videoInfo || !videoInfo.items) {
                return res({success: false, msg: "The video was not found"});
            }
        
            let item = videoInfo.items[0];
            if (!item) {
                return res({success: false, msg: "The video was not found"});
            }
    
            let snippet = item.snippet;
            let stats = item.statistics;
            let status = item.status;

            let end = new Date();
            let diff = end.getTime() - start.getTime();
    
            newVideo.isEmpty = false;
            newVideo.youtubeId = item.id;
            newVideo.title = snippet.title;
            newVideo.description = snippet.description;
            newVideo.thumbnails = snippet.thumbnails;
            newVideo.youtubeTags = snippet.tags;
            newVideo.categoryId = snippet.categoryId;
            newVideo.category = getCategory(snippet.categoryId);
            newVideo.status = status;
            newVideo.statistics = replaceWithNumbers(stats);
            newVideo.url = `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`
            newVideo.youtubeChannelId = snippet.channelId;
            newVideo.meta.publishedAt = new Date(snippet.publishedAt);
            newVideo.meta.requestInfo = {
                lastRequest: start,
                start,
                end,
                time: diff,
                by: req.user.id
            }
    
            newVideo.save((err, video) => {
                if (err) {
                    logger.error(err);
                    return res({success: false, error: err, msg: "Something went wrong"});
                }
                return res({success: true, msg: `Successfully added "${video.title}"`, video})
            })
        }
    })
}

const updateVideoData = function(video, req) {
    return new Promise(async (res) => {

        let start = new Date();

        if (video.meta.requestInfo.lastRequest) {
            let diff = new Date().getTime() - video.meta.requestInfo.lastRequest.getTime();
            let diffHours = diff / 3.6e+6;
            if (diffHours < 12) {
                return res({success: false, msg: "The previous update request was less than 12 hours ago. Please try again later."});
            }
        }

        let videoInfo = await youtube.getVideoInfo(youtubeId);
        if (!videoInfo || !videoInfo.items) {
            return res({success: false, msg: "The video was not found"});
        }
    
        let item = videoInfo.items[0];
        if (!item) {
            return res({success: false, msg: "The video was not found"});
        }

        let snippet = item.snippet;
        let stats = item.statistics;
        let status = item.status;

        let end = new Date();
        let diff = end.getTime() - start.getTime();

        video.isEmpty = false;
        video.youtubeId = item.id;
        video.title = snippet.title;
        video.description = snippet.description;
        video.thumbnails = snippet.thumbnails;
        video.youtubeTags = snippet.tags;
        video.categoryId = snippet.categoryId;
        video.category = getCategory(snippet.categoryId);
        video.status = status;
        video.statistics = replaceWithNumbers(stats);
        video.url = `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`
        video.youtubeChannelId = snippet.channelId;
        video.meta.publishedAt = new Date(snippet.publishedAt);
        video.meta.requestInfo = {
            lastRequest: start,
            start,
            end,
            time: diff,
            by: req.user.id
        }

        video.save((err, video) => {
            if (err) {
                logger.error(err);
                return res({success: false, error: err, msg: "Something went wrong"});
            }
            return res({success: true, msg: `Successfully updated "${video.title}"`, video})
        })
    })
}

const replaceWithNumbers = function(obj) {
    Object.keys(obj).forEach(k => {
        obj[k] = parseInt(obj[k]);
    })
    return obj;
}

const getList = function(req, res, skip, limit) {
    return new Promise(async (res) => {
        let currentSort = req.query.sort;
        let currentOrder = req.query.order;
        let currentQuery = req.query.q;
    
        let starring = req.query.starring;
        let editor = req.query.editor;
    
        let disableChannel = starring || editor;
        let channelId = req.query.channel;
        let user;

        if (!channelId || !isValidObjectId(channelId)) {
            let ids = await channelFunctions.getChannelIds(req.user.id);
            if (!ids) {
                return res({success: false, msg: "No channels found for user"});
            }
            channelId = ids;
        } else {
            channelId = [channelId];
        }
    
        if (disableChannel) {
            user = await userFunctions.getInfoForUser(starring || editor, "_id name safeName username");
        }
    
        if (!user) {
            disableChannel = false;
        }
    
        if (!currentSort || !Object.keys(sorts).includes(currentSort)) {
            currentSort = "upload date";
        } else {
            currentSort = currentSort.toLowerCase()
        }
    
        if (!currentOrder || (currentOrder != "1" && currentOrder != "-1")) {
            currentOrder = "-1";
        }
    
        currentOrder = parseInt(currentOrder);
    
        let videoQuery = {};
    
        if (disableChannel) {
            if (starring) {
                videoQuery.starring = user.id;
            } else if (editor) {
                videoQuery.editor = user.id;
            }
        } else {
            videoQuery.channel = {$in: channelId};
        }
    
    
        let videoSort = {}
    
        let field = sorts[currentSort];
    
        videoSort[field] = currentOrder;
    
        let selects = ["title", "statistics", "isEmpty", "createdAt", "thumbnails", "meta", "status"];
        if (!field.startsWith("statistics") && !field.startsWith("meta") && !selects.includes(field) && !field.startsWith("status")) {
            selects.push(field);
        }

        let channel;
        if (!disableChannel) {
            channel = await channelFunctions.getChannel(channelId[0], req.user.id);
            if (!channel) {
                return res({success: false, msg: "Channel not found"});
            }
        }
    
        Video.find(videoQuery).sort(videoSort).select(selects.join(" ")).limit(limit).sort({createdAt: -1}).skip(skip).exec((_err, videos) => {
            if (_err) {
                return next(_err);
            }
            let params = {
                currentSort,
                currentOrder,
                currentQuery,
                field,
                subtitle: disableChannel ? (starring ? "Starring " : "Edited by ") + user.username : "For channel " + channel.name,
                videoQuery,
                videoSort,
                disableChannel,
                channelId
            }
            return res({success: true, params, videos})
        })
    })
}

module.exports = {categories, sorts, getCategory, createVideo, updateVideoData, replaceWithNumbers, getList}