const assert = require('assert');
const { hoursCalculate } = require('../utils/helper');
const mock = require('./mockdb-clock-in');

describe('Cálculo de horas extras trabalhadas', () => {

    describe('Dias normais', () => {

        it('Deve alguma coisa', () => {
            // console.log(JSON.stringify(hoursCalculate(mock.normalDay)));
            assert.equal([1, 2, 3].indexOf(4), -1);
        });

    });

});