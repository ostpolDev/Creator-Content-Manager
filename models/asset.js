const mongoose = require('mongoose');

const AssetSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    cleanName: {
        type: String,
        required: false
    },
    uuid: {
        type: String,
        required: true
    },
    description: {
        raw: String,
        rendered: String
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    extention: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    batchSize: {
        type: Number,
        required: true
    },
    assetType: {
        type: String,
        required: true
    },
    legalInfo: {
        type: String
    },
    licence: {
        type: String
    },
    source: {
        type: String
    },
    tags: [String],
    tagsString: String,
    purchase: {
        isPurchased: Boolean,
        price: Number,
        purchasedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        hidePurchaseAmount: Boolean
    },
    allowedPlatforms: {
        videos: Boolean,
        streams: Boolean
    },
    unsafe: {
        type: Boolean,
        required: true,
        default: false
    },
    unsafeInfo: {
        reason: String,
        reasonBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    meta: {
        downloads: {
            type: Number,
            default: 0
        },
        hasCustomName: Boolean,
        uploadedBy: {
            username: String,
            safeName: String
        }
    }
}, {timestamps: true});

module.exports = mongoose.model("Asset", AssetSchema);