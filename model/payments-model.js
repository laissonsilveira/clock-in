const { Schema, model } = require('mongoose');
const modelName = 'payments';
module.exports =
    model(modelName, new Schema({
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
        },
        company: {
            type: Number,
            index: true
        }
    }), modelName);