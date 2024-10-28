const logger = require("./logger");
const { CompressString, ParseYouTubeTags } = require("./textHelpers");
const { GetCountryInfo } = require('./countryHelpers');
const { knex } = require("./database");

const CHANNEL_URL = `https://www.googleapis.com/youtube/v3/channels?key=${process.env.CREATOR_YT_API}`;
const VIDEO_URL = `https://www.googleapis.com/youtube/v3/videos?key=${process.env.CREATOR_YT_API}`;

async function GetChannelInfo(username) {
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

        let compResult = CompressString(channelInfo.description);
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

//Ot5FQobG33A
async function GetVideoInfo(id) {
    if (id.startsWith("http")) {
        let params = new URLSearchParams("?" + id.split("?")[1]);
        let v = params.get("v");
        if (!v) {
            return null;
        }
        id = v;
    }

    try {
        let videoInfo = {
            video: {
                youtube_id: id,
                title: "",
                description: "",
                rendered_description: "",
                compression: "",
                thumbnail_url: "",
                uploaded_at: new Date()
            },
            video_info: {
                views: 0,
                likes: 0,
                dislikes: 0,
                comments: 0,
                tags: "",
                properties: {}
            }
        }

        let fullURL = `${VIDEO_URL}&id=${id}&part=snippet,statistics,contentDetails`;
        let result = await fetch(fullURL, {
            headers: {
                "Accept": "application/json"
            }
        })
        let json = await result.json();

        if (!json.items || json.items.length <= 0) {
            return null;
        }

        const item = json.items[0];
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
        videoInfo.video_info.properties = {
            category: snippet.categoryId,
            language: snippet.defaultLanguage,
            contentDetails
        }

        let comp = CompressString(videoInfo.video.rendered_description);
        if (comp) {
            videoInfo.video.rendered_description = comp.text;
            videoInfo.video.compression = comp.compression;
        }
        
        return videoInfo;

    } catch (e) {
        logger.error(e);
        return null;
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

module.exports = { GetChannelInfo, GetVideoInfo, IDToCategory }
