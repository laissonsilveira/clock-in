const { Schema, model } = require('mongoose');

const modelName = 'users';
module.exports =
    model(modelName, new Schema({
        username: String,
        password: String
    }), modelName);