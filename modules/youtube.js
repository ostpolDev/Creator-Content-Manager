const axios = require('axios');
const logger = require('./logger');

// EOTyLqJWhZQ

const videoURL = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&key=" + process.env.YOUTUBE_KEY;
const channelURL = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,status,brandingSettings&key=" + process.env.YOUTUBE_KEY;

const getURLForVideo = function(id) {
    return `${videoURL}&id=${encodeURIComponent(id)}`;
}

const getURLForChannel = function(id) {
    return `${channelURL}&id=${encodeURIComponent(id)}`;
}

const getVideoInfo = function(id) {
    logger.info(`Making youtube request for video ${id}`);
    return new Promise((res) => {
        let url = getURLForVideo(id);
        axios.get(url).then(response => {
            res(response.data);
        }).catch(error => {
            logger.error(error);
            return res();
        })
    })
}

const getChannelInfo = function(id) {
    logger.info(`Making youtube request for channel ${id}`);
    return new Promise((res) => {
        let url = getURLForChannel(id);
        axios.get(url).then(response => {
            res(response.data);
        }).catch(error => {
            logger.error(error);
            return res();
        })
    })
}

module.exports = {getVideoInfo, getURLForVideo, getURLForChannel, getChannelInfo};