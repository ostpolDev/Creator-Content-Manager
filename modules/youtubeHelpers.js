const logger = require("./logger");
const { CompressString, ParseYouTubeTags } = require("./textHelpers");
const { GetCountryInfo } = require('./countryHelpers');
const { Knex } = require("knex");

const CHANNEL_URL = `https://www.googleapis.com/youtube/v3/channels?key=${process.env.CREATOR_YT_API}`;
const VIDEO_URL = `https://www.googleapis.com/youtube/v3/videos?key=${process.env.CREATOR_YT_API}`;
const VIDEO_SEARCH_URL = `https://www.googleapis.com/youtube/v3/search?key=${process.env.CREATOR_YT_API}&maxResults=50&type=video`

async function GetChannelInfo(username, knex) {
    try {
        if (username.startsWith("@")) {
            username = username.substring(1);
        }

        let channelInfo = {
            id: "",
            name: "",
            handle: "",
            image_url: "",
            header_image_url: "",
            subscribers: 0,
            views: 0,
            channel_creation: new Date(),
            tags: "",
            description: "",
            compression: "none",
            country: "--",
            settings: {}
        }
        logger.info(`Fetching YouTube channel: ${username}`);
        
        let fullURL = `${CHANNEL_URL}&part=snippet,statistics,brandingSettings&forHandle=${encodeURIComponent(username)}`;
        let result = await fetch(fullURL, {
            headers: {
                "Accept": "application/json"
            }
        });
        let json = await result.json();

        if (!json.items || json.items.length <= 0) {
            return null;
        }

        const item = json.items[0];
        const snippet = item.snippet;
        const statistics = item.statistics;
        const brandingSettings = item.brandingSettings;

        channelInfo.id = item.id;
        channelInfo.name = snippet.title;
        channelInfo.handle = `@${username}`;
        channelInfo.image_url = snippet.thumbnails.high.url;
        channelInfo.header_image_url = brandingSettings.image.bannerExternalUrl;
        channelInfo.subscribers = Number.parseInt(statistics.subscriberCount);
        channelInfo.views = Number.parseInt(statistics.viewCount);
        channelInfo.channel_creation = new Date(snippet.publishedAt);
        channelInfo.tags = (ParseYouTubeTags(brandingSettings.channel.keywords || "") || []).join(",");
        channelInfo.description = snippet.description;
        channelInfo.country = await GetCountryInfo(snippet.country);

        let compResult = CompressString(channelInfo.description, false, knex);
        if (compResult) {
            channelInfo.description = compResult.text; 
            channelInfo.compression = compResult.compression;
        }

        if (channelInfo.description.length > 1000) {
        }

        channelInfo.settings.videoCount = statistics.videoCount;
        channelInfo.settings.hiddenSubscriberCount = statistics.hiddenSubscriberCount;

        return channelInfo;

    } catch (e) {
        logger.error(e);
        return null;
    }
}

async function GetVideoInfo(id, knex, customProps) {
    if (id.startsWith("http")) {
        let params = new URLSearchParams("?" + id.split("?")[1]);
        let v = params.get("v");
        if (!v) {
            return null;
        }
        id = v;
    }

    try {

        let fullURL = `${VIDEO_URL}&id=${id}&part=snippet,statistics,contentDetails`;
        let result = await fetch(fullURL, {
            headers: {
                "Accept": "application/json"
            }
        })
        let json = await result.json();

        if (!json.items || json.items.length <= 0) {
            logger.error(`Failed to find video`);
            return null;
        }

        const item = json.items[0];
        return await FormatVideoInfo(item, knex, customProps);

    } catch (e) {
        logger.error(e);
        return null;
    }
}

async function FormatVideoInfo(item, knex, customProps) {
    try {
        let videoInfo = {
            video: {
                youtube_id: item.id,
                title: "",
                description: "",
                rendered_description: "",
                compression: "",
                thumbnail_url: "",
                uploaded_at: new Date(),
            },
            video_info: {
                views: 0,
                likes: 0,
                dislikes: 0,
                comments: 0,
                tags: "",
                properties: {},
                duration: 0
            }
        }

        const snippet = item.snippet;
        const statistics = item.statistics;
        const contentDetails = item.contentDetails;

        videoInfo.video.title = snippet.title;
        videoInfo.video.rendered_description = snippet.description;
        videoInfo.video.thumbnail_url = snippet.thumbnails.maxres.url;
        videoInfo.video.uploaded_at = new Date(snippet.publishedAt);

        videoInfo.video_info.views = Number.parseInt(statistics.viewCount);
        videoInfo.video_info.likes = Number.parseInt(statistics.likeCount);
        videoInfo.video_info.comments = Number.parseInt(statistics.commentCount);
        videoInfo.video_info.dislikes = -1;
        videoInfo.video_info.tags = snippet.tags.join(",");

        if (typeof contentDetails.duration !== "undefined") {
            videoInfo.video_info.duration = YTDurationToSeconds(contentDetails.duration);
        }

        videoInfo.video_info.properties = {
            category: snippet.categoryId,
            language: snippet.defaultLanguage,
            contentDetails
        }

        if (customProps) {
            videoInfo.video_info.properties = {
                ...videoInfo.video_info.properties,
                ...customProps
            }
        }

        let comp = CompressString(videoInfo.video.rendered_description, false, knex);
        if (comp) {
            videoInfo.video.rendered_description = comp.text;
            videoInfo.video.compression = comp.compression;
        }
        
        return videoInfo;

    } catch (e) {
        logger.error(e);
        return false;
    }
}

async function CreateVideosForChannel(channel_id, knex, userId) {
    logger.info(`Importing videos for channel: ${channel_id}`);

    try {

        const start = Date.now();

        let videoIds = await ListVideoIDsForChannel(channel_id);
        if (!videoIds) {
            logger.error(`Failed to fetch video ids for channel ${channel_id}`);
            return false;
        }

        logger.info(`Found ${videoIds.length} videos to import for channel ${channel_id}`);

        let idParts = [];

        while (videoIds.length > 0) {
            idParts.push(videoIds.splice(0, 25).map(x => encodeURIComponent(x)).join(","));
        }

        logger.info(`Video fetching split into ${idParts.length} parts for channel ${channel_id}`);
        
        for (let i = 0; i < idParts.length; i++) {
            logger.info(`Processing part ${i + 1} / ${idParts.length} for channel ${channel_id}`);
            await ProcessVideoPage(idParts[i], knex, userId, channel_id);
        }

        logger.info(`Successfully imported channel videos for channel ${channel_id} in ${Date.now() - start}ms`);

        return true;
    } catch (e) {
        logger.error(`Failed video import for channel: ${channel_id}`);
        logger.error(e);
        return false;
    }
}

/**
 * 
 * @param {string} channel_id 
 * @param {string?} pageToken 
 * @param {[string]?} existing 
 * @returns {Promise<[string]>}
 */
async function ListVideoIDsForChannel(channel_id, pageToken, existing) {
    let url = `${VIDEO_SEARCH_URL}&channelId=${encodeURIComponent(channel_id)}`;
    if (pageToken) {
        url = `${url}?pageToken=${encodeURIComponent(pageToken)}`;
    }

    try {

        let ids = existing ? existing : [];
        const res = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });
        const json = await res.json();

        if (!json.items) {
            return [];
        }

        ids = json.items.filter(x => x.id.kind == "youtube#video").map(x => x.id.videoId);

        if (!json.nextPageToken || (pageToken && json.nextPageToken == pageToken)) {
            return ids;
        }

        return await ListVideoIDsForChannel(channel_id, json.nextPageToken, ids);

    } catch (e) {
        logger.error(e);
        return false;
    }
}

/**
 * 
 * @param {string} idPart 
 * @param {Knex} knex 
 * @returns 
 */
async function ProcessVideoPage(idPart, knex, userId, channel, pageToken) {
    let url = `${VIDEO_URL}&id=${idPart}&part=snippet,statistics,contentDetails&maxResults=50`;

    if (pageToken) {
        url = `${url}&pageToken=${encodeURIComponent(pageToken)}`;
    }

    try {

        const start = Date.now();

        const res = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });
        const json = await res.json();

        if (!json.items || json.items.length <= 0) {
            logger.error(`Failed to find videos`);
            return false;
        }

        logger.info(`Importing ${json.items.length} videos`);
        for (let i = 0; i < json.items.length; i++) {

            const videoResult = await FormatVideoInfo(json.items[i], knex, { autoImport: true, actualDate: new Date() });
            const newVideo = await knex("videos").insert({
                ...videoResult.video,
                added_by: userId,
                channel,
                created_at: videoResult.video.uploaded_at || new Date()
            }, "id");

            if (!newVideo[0]) {
                logger.error(`Failed to insert video into database for ${channel}: ${json.items[i].id}`);
                continue;
            }

            await knex("video_infos").insert({
                ...videoResult.video_info,
                id: newVideo[0].id
            });
            
        }
        logger.info(`Successfully imported videos in ${Date.now() - start}ms`);
        
        if (json.nextPageToken && (!pageToken || pageToken != json.nextPageToken)) {
            logger.info(`Checking next page for videos`);
            await ProcessVideoPage(idPart, knex, userId, channel, json.nextPageToken);
        }

    } catch (e) {
        logger.error(e);
        return false;
    }
}

const CATEGORY_LOOKUP = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "18": "Short Movies",
    "19": "Travel & Events",
    "20": "Gaming",
    "21": "Videoblogging",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Technology",
    "29": "Nonprofits & Activism",
    "30": "Movies",
    "31": "Anime/Animation",
    "32": "Action/Adventure",
    "33": "Classics",
    "34": "Comedy",
    "35": "Documentary",
    "36": "Drama",
    "37": "Family",
    "38": "Foreign",
    "39": "Horror",
    "40": "Sci-Fi/Fantasy",
    "41": "Thriller",
    "42": "Shorts",
    "43": "Shows",
    "44": "Trailers"
}

function IDToCategory(id) {
    return CATEGORY_LOOKUP[id] || "--";
}

// https://stackoverflow.com/a/30134889
function YTDurationToSeconds(duration) {
    var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    match = match.slice(1).map(function (x) {
        if (x != null) {
            return x.replace(/\D/, '');
        }
    });

    var hours = (parseInt(match[0]) || 0);
    var minutes = (parseInt(match[1]) || 0);
    var seconds = (parseInt(match[2]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

module.exports = { GetChannelInfo, GetVideoInfo, IDToCategory, YTDurationToSeconds, CreateVideosForChannel }
