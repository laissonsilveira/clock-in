const { Schema, model } = require('mongoose');

const modelName = 'clock-in';
module.exports =
    model(modelName, new Schema({
        date: {
            type: String,
            index: true
        },
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
        },
        company: {
            type: Number,
            index: true
        }
    }), modelName);