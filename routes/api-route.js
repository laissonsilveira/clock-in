
const router = require('express').Router();
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db-helper');
const { authentication } = require('../utils/auth-helper');
const ClockIn = require('../utils/clock-in');

router.post('/login', authentication, async (req, res) => {
    res.end();
});

router.post('/clocks', authentication, async (req, res, next) => {
    try {
        const hours = req.body;
        // LOGGER.info(JSON.stringify(hours));
        const db = new DBHelper('clock-in');
        const filter = { 'divergences.date': hours.divergences[0].date };
        const docs = await db.listDocs(filter);
        if (Array.isArray(docs) && docs.length) {
            await db.updateDoc(filter, hours);
            LOGGER.debug(`docs.length: ${docs.length}`);
        } else {
            const response = await db.insertDoc(hours);
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
        const { date } = req.query;
        LOGGER.info(`Recuperando batidas salvas ${date ? date : ''}`);
        const db = new DBHelper('clock-in');
        if (date) {
            const docs = await db.listDocs({ 'divergences.date': date });
            if (docs.length)
                res.json(docs[0]);
            else
                res.end();
        } else {
            const docs = await db.listDocs();
            const clockIn = new ClockIn(docs);
            res.json(clockIn.hoursCalculate());
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;