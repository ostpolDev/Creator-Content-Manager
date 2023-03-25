const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    name: {
        type: String
    },
    username: {
        type: String,
        required: true
    },
    safeName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mailHash: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    description: {
        raw: String,
        rendered: String
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    meta: {
        assetCount: {
            type: Number,
            default: 0
        },
        blocked: {
            type: Boolean,
            default: false
        },
        preferences: {
            hiddenFavorites: Boolean,
            disableMarkdown: Boolean,
            ampm: Boolean,
            autoplay: Boolean,
            hideAssetVideoList: Boolean,
            showGameDescriptions: Boolean,
            autoLoadMore: Boolean,
            navUserIcon: String,
            defaultChannel: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Channel'
            },
            mainPage: {
                showVideos: {
                    type: Boolean,
                    default: true
                },
                showAssets: {
                    type: Boolean,
                    default: true
                },
                randomTip: {
                    type: Boolean,
                    default: true
                },
                showAlbums: {
                    type: Boolean,
                    default: true
                }
            }
        },
        lastRename: {
            when: Date,
            from: String,
            to: String
        }
    }
}, {timestamps: true});

module.exports = mongoose.model("User", UserSchema);