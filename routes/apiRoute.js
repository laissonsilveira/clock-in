
const router = require('express').Router();
const moment = require('moment');
const momentDurationFormatSetup = require('moment-duration-format');
momentDurationFormatSetup(moment);
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db');
const { authentication, hoursCalculate } = require('../utils/helper');

router.post('/clocks', authentication, (req, res, next) => {
    const hours = req.body;
    // LOGGER.info(JSON.stringify(hours));
    const db = new DBHelper('clock-in');
    db.insertDoc(hours)
        .then(response => {
            LOGGER.debug(`Result insert: ${JSON.stringify(response)}`);
            res.end();
        })
        .catch(err => next(err));
});

router.delete('/clocks/:id', authentication, (req, res, next) => {
    const ID = req.params.id;
    if(ID) {
        const db = new DBHelper('clock-in');
        db.deleteDoc(ID)
            .then(() => {
                LOGGER.debug(`Registro '${ID}' deletado com sucesso`);
                res.end();
            })
            .catch(err => next(err));
    } else {
        res.end();
    }
});

router.get('/clocks', authentication, (req, res, next) => {
    LOGGER.info('Recuperando batidas salvas');
    const db = new DBHelper('clock-in');
    db.listDocs()
        .then(body => {
            res.json(hoursCalculate(body));
        })
        .catch(err => next(err));
});

module.exports = router;