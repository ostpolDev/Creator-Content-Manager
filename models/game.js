const mongoose = require('mongoose');

// API URL: https://store.steampowered.com/api/appdetails?appids=440
const GameSchema = mongoose.Schema({
    appType: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    appId: {
        type: String,
        required: true
    },
    description: {
        detailed: String,
        about: String,
        short: String
    },
    dlc: [Number],
    header: {
        type: String
    },
    website: {
        type: String
    },
    developers: [String],
    publishers: [String],
    platforms: {
        type: Map,
        of: Boolean
    },
    categories: [{
        id: Number,
        description: String
    }],
    genres: [{
        id: Number,
        description: String
    }],
    screenshots: [{
        id: Number,
        thumbnail: String,
        full: String
    }],
    videos: [{
        id: Number,
        name: String,
        thumbnail: String,
        webm: Object,
        mp4: Object,
        highlight: Boolean
    }],
    release_date: {
        comingSoon: Boolean,
        date: String
    },
    background: {
        normal: String,
        raw: String
    },
    contentDescription: {
        ids: [String],
        notes: String
    },
    meta: {
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastUpdate: Date,
        isCustom: {
            type: Boolean,
            default: false
        }
    }
}, {timestamps: true})

module.exports = mongoose.model("Game", GameSchema);
