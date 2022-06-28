const mongoose = require('mongoose');

const MetaSchema = mongoose.Schema({
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    url: {
        type: String,
        required: true
    },
    uuid: {
        type: String,
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