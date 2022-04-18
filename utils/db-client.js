/**
 * @autor Laisson R. Silveira<laisson.r.silveira@gmail.com>
 *
 * Created on 24/11/2019
 */
const LOGGER = require('./logger');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.set('useCreateIndex', true);
const CONFIG_DATABASE = __CONFIG.database;
const { MONGODB_USER, MONGODB_PWD } = process.env;

function serializer(data) {
    const query = JSON.stringify(data.query);
    const doc = JSON.stringify(data.doc || {});
    return `[DATABASE] '${data.coll}.${data.method}(${query}, ${doc})'`;
}

function _getUri() {
    return `mongodb+srv://${escape(MONGODB_USER)}`
        + `:${escape(MONGODB_PWD)}`
        + `@${CONFIG_DATABASE.host}`
        + `/${CONFIG_DATABASE.dbName}?retryWrites=true&w=majority`;
}

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', () => {
    LOGGER.info(`[DATABASE] conectado ao banco de dados: '${CONFIG_DATABASE.host}/${CONFIG_DATABASE.dbName}'`);
});

// If the connection throws an error
mongoose.connection.on('error', err => {
    LOGGER.error(`[DATABASE] erro na conexão: ${err}`);
    process.exit(-1);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', () => {
    LOGGER.info('[DATABASE] banco de dados desconectado');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        LOGGER.info('[DATABASE] conexão com banco de dados foi perdida pois a aplicação foi finalizada');
        process.exit(0);
    });
});

mongoose.set('debug', (coll, method, query, doc) => {
    if (CONFIG_DATABASE.isDebug) {
        let dbQuery = {
            coll: coll,
            method: method,
            query: query,
            doc: doc
        };
        LOGGER.debug(serializer(dbQuery));
    }
});

require('../model/users-model');
require('../model/payments-model');
require('../model/clock-in-model');

// Connect BD
mongoose.connect(_getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
