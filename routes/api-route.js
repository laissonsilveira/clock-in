
const router = require('express').Router();
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db-helper');
const { authentication } = require('../utils/auth-helper');
const ClockIn = require('../utils/clock-in');

router.post('/clocks', authentication, async (req, res, next) => {
    try {
        const hours = req.body;
        // LOGGER.info(JSON.stringify(hours));
        const db = new DBHelper('clock-in');
        const response = await db.insertDoc(hours);
        LOGGER.debug(`Result insert: ${JSON.stringify(response)}`);
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
        LOGGER.info('Recuperando batidas salvas');
        const db = new DBHelper('clock-in');
        const docs = await db.listDocs();
        const clockIn = new ClockIn(docs);
        res.json(clockIn.hoursCalculate());
    } catch (err) {
        next(err);
    }
});

module.exports = router;