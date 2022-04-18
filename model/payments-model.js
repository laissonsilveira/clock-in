const mongoose = require('mongoose');
const modelName = 'payments';
module.exports = mongoose.model(modelName, {
    date: {
        type: Date,
        require: true,
        index: true
    },
    value: {
        type: Number,
        require: true
    },
    minutes: {
        type: Number,
        require: true
    }
}, modelName);