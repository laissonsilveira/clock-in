const mongoose = require('mongoose');
const modelName = 'users';
module.exports = mongoose.model(modelName, {
    username: String,
    password: String
}, modelName);