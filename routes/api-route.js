
const router = require('express').Router();
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db-helper');
const { authentication } = require('../utils/auth-helper');
const ClockIn = require('../utils/clock-in');

// (async () => {
//     try {
//         global.__CONFIG = require('../cfg');
//         require('../utils/db-client');
//         const db = new DBHelper('clock-in');
//         const bkp = require('../importAbril-13Out/DivergAbril-13Out.html.json');
//         await db.insertManyDoc(bkp);
//     } catch (error) {
//         console.error(error);
//     }
// })();

router.post('/login', authentication, async (req, res) => {
    res.end();
});

router.post('/clocks', authentication, async (req, res, next) => {
    try {
        const divergence = req.body;
        LOGGER.info(`Salvando batida ${JSON.stringify(divergence)}`);
        const db = new DBHelper('clock-in');
        const filter = { date: divergence.date };
        const docs = await db.listDocs(filter);
        if (Array.isArray(docs) && docs.length) {
            await db.updateDoc(filter, divergence);
            LOGGER.debug(`docs.length: ${docs.length}`);
        } else {
            const response = await db.insertDoc(divergence);
            LOGGER.debug(`Result insert: ${JSON.stringify(response)}`);
        }
        res.end();
    } catch (error) {
        next(error);
    }
});

router.delete('/clocks/:id', authentication, async (req, res, next) => {
    try {
        const ID = req.params.id;
        LOGGER.info(`Removendo batida ${ID}`);
        if (ID) {
            const db = new DBHelper('clock-in');
            await db.deleteDoc(ID);
            LOGGER.debug(`Registro '${ID}' deletado com sucesso`);
        }
        res.end();
    } catch (err) {
        next(err);
    }
});

router.get('/clocks', authentication, async (req, res, next) => {
    try {
        let { date } = req.query;
        let docs;
        LOGGER.info(`Recuperando batidas salvas ${date ? date : ''}`);
        const db = new DBHelper('clock-in');
        if (date) {
            docs = await db.listDocs({ date });
        } else {
            docs = await db.listDocs();
        }
        const clockIn = new ClockIn(docs);
        res.json(clockIn.hoursCalculate());
    } catch (err) {
        next(err);
    }
});

module.exports = router;