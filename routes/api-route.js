
const router = require('express').Router();
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db-helper');
const { authentication } = require('../utils/auth-helper');
const ClockIn = require('../utils/clock-in');
const daysWeek = new Map();
daysWeek.set('Monday', 'Segunda');
daysWeek.set('Tuesday', 'Terça');
daysWeek.set('Wednesday', 'Quarta');
daysWeek.set('Thursday', 'Quinta');
daysWeek.set('Friday', 'Sexta');
daysWeek.set('Saturday', 'Sábado');
daysWeek.set('Sunday', 'Domingo');

(async () => {
    global.__CONFIG = require('../cfg');
    require('../utils/db-client');
    const db = new DBHelper('clock-in');

    const bkp = require('../importAbril-13Out/bd.json');
    await db.insertManyDoc(bkp);
})();

router.post('/login', authentication, async (req, res) => {
    res.end();
});

router.post('/clocks', authentication, async (req, res, next) => {
    try {
        const divergence = req.body;
        if (daysWeek.has(divergence.date)) {
            divergence.date = daysWeek.get(divergence.date);
        }

        // LOGGER.info(JSON.stringify(hours));
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
        if (daysWeek.has(date)) {
            date = daysWeek.get(date);
        }
        LOGGER.info(`Recuperando batidas salvas ${date ? date : ''}`);
        const db = new DBHelper('clock-in');
        if (date) {
            const docs = await db.listDocs({ date });
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