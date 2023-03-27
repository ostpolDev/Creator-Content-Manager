const mongoose = require('mongoose');

const BatchSchema = mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    skippedCount: {
        type: Number,
        default: 0
    },
    skipped: [{
        name: String,
        reason: String,
        size: Number,
        mimetype: String,
        extention: String,
        admin: {
            error_message: String,
            error_stack: String,
            error_name: String
        }
    }],
    length: Number,
    attemptedLength: Number,
    fileSize: Number,
    attemptedFileSize: Number,
    missedFileSize: Number,
    uploadTime: {
        start: Date,
        end: Date,
        time: Number
    },
    isAlbum: {
        type: Boolean,
        default: false
    },
    artist: {
        type: String
    },
    hasNoArtist: {
        type: Boolean,
        default: false
    },
    cover: {
        hasCover: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedAt: Date,
        size: Number,
        extention: String,
        mimetype: String
    },
    purchase: {
        isPurchased: Boolean,
        price: Number,
        purchasedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        hidePurchaseAmount: Boolean
    },
    customInfo: {
        hasCustomInfo: Boolean,
        description: {
            raw: String,
            rendered: String
        }
    },
    totalDownloads: {
        type: Number,
        default: 0
    },
    nsfw: {
        type: Boolean,
        default: false
    },
    containsNSFW: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

module.exports = mongoose.model("Batch", BatchSchema);