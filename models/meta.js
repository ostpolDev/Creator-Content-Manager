const mongoose = require('mongoose');

const MetaSchema = mongoose.Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    requestInfo: {
        lastRequest: Date,
        start: Date,
        end: Date,
        time: Number
    },
    size: {
        type: Number,
        required: true
    }
}, {timestamps: true});

module.exports = mongoose.model("Meta", MetaSchema);