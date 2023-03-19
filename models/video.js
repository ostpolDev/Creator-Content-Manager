const mongoose = require('mongoose');

const VideoSchema = mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    games: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }],
    url: {
        type: String,
        required: false
    },
    youtubeId: String,
    youtubeChannelId: String,
    assets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    editor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    starring: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
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
            time: Number,
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        move: {
            lastMove: Date,
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            from: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Channel'
            },
            to: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Channel'
            }
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
        viewCount: Number,
        likeCount: Number,
        favoriteCount: Number,
        commentCount: Number
    },
    isEmpty: {
        type: Boolean,
        required: true,
        default: true
    },
    categoryId: String,
    category: String,
    tags: [String],
    youtubeTags: [String],
    thumbnails: Object
}, {timestamps: true});

module.exports = mongoose.model("Video", VideoSchema);