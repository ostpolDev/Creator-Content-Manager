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
            disableMarkdown: Boolean
        },
        lastRename: {
            when: Date,
            from: String,
            to: String
        }
    }
}, {timestamps: true});

module.exports = mongoose.model("User", UserSchema);