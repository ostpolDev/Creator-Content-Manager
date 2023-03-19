const mongoose = require('mongoose');

const ChannelSchema = mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    access: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    name: {
        type: String,
        required: true
    },
    thumbnails: Object,
    youtubeId: String,
    url: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    customUrl: {
        type: String
    },
    meta: {
        requestInfo: {
            lastRequest: Date,
            start: Date,
            end: Date,
            time: Number,
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    },
    statistics: {
        viewCount: String,
        subscriberCount: String,
        hiddenSubscriberCount: Boolean,
        videoCount: String
    },
    status: {
        privacyStatus: String,
        isLinked: Boolean,
        longUploadStatus: String,
        madeForKids: String
    },
    public: {
        type: Boolean,
        default: false,
        required: true
    },
    publishedAt: {
        type: Date
    },
    country: {
        type: String
    },
    countryInfo: {
        lastUpdate: Date,
        name: {
            common: String,
            official: String,
            native: {
                official: String,
                common: String
            }
        },
        flag: String
    }
}, {timestamps: true});

module.exports = mongoose.model("Channel", ChannelSchema);