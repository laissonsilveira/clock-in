const mongoose = require('mongoose');
const modelName = 'clock-in';
module.exports = mongoose.model(modelName, {
    status: String,
    date_created: String,
    divergences: [{
        date: String,
        hours: String,
        negative: [String],
        positive: [String],
        extra: [String],
        extraAceleration: [String],
        message: String,
        dayOff: Boolean,
        middayOff: Boolean
    }]
}, modelName);