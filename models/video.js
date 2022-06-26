const mongoose = require('mongoose');

const VideoSchema = mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    url: {
        type: String,
        required: false
    },
    youtubeId: String,
    assets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    description: {
        type: String
    },
    editors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    starring: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    meta: {
        editorsString: String,
        starringString: String,
        demonetized: Boolean,
        ageRestricted: Boolean,
        channelId: String,
        publishedAt: Date,
        requestInfo: {
            lastRequest: Date,
            start: Date,
            end: Date,
            time: Number
        }
    },
    status: {
        uploadStatus: String,
        privacyStatus: String,
        licence: String,
        embeddable: Boolean,
        publicStatsViewable: Boolean,
        madeForKids: Boolean
    },
    statistics: {
        viewCount: String,
        likeCount: String,
        favoriteCount: String,
        commentCount: String
    },
    category: String,
    tags: [String],
    youtubeTags: [String],
    thumbnails: Object
}, {timestamps: true});

module.exports = mongoose.model("Video", VideoSchema);