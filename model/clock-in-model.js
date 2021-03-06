const mongoose = require('mongoose');
const modelName = 'clock-in';
module.exports = mongoose.model(modelName, {
    date: String,
    hours: String,
    negative: [String],
    positive: [String],
    extra: [String],
    extraAceleration: [String],
    nextDay: [String],
    message: String,
    dayOff: Boolean,
    middayOff: Boolean,
    isHoliday: Boolean,
    worked_hours: {
        type: String,
        default: '8'
    }
}, modelName);