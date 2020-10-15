const { writeFileSync, readFileSync } = require('fs');
const { join } = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

console.log('---------------------------------------------');
console.time();
scrape('DivergAbril-13Out.html');
console.timeEnd();

function scrape(type) {
    console.log(`Scraping ${type}...`);
    const filePath = join(__dirname, type);
    let TRs = _getTRs(filePath);
    const divergences = _getDivergences(TRs);
    const fileNameResult = `${type}.json`;
    writeFileSync(fileNameResult, JSON.stringify(divergences, null, 4), 'utf-8');
    console.log(`Finalizado scrape do ${type} (Arquivo salvo em ${join(__dirname, fileNameResult)})`);
}

function _getDivergences(trs) {
    let __attbs;
    const __divergences = [];
    const __set = (tds, index = 0) => {
        const hourTD = tds[index].textContent.trim();
        const reasonTD = tds[tds.length - 2].textContent.trim();
        if ('Compensar Positivo' === reasonTD) {
            __attbs.positive.push(hourTD);
        } else if ('Compensar Negativo' === reasonTD) {
            __attbs.negative.push(hourTD);
        } else if ('Hora Extra' === reasonTD) {
            __attbs.extra.push(hourTD);
        }
    };
    for (const tr of trs) {
        const tds = [...tr.querySelectorAll('td')];
        let date, hours;
        if (tr.id && tr.id === 'noIf') {
            __set(tds);
        } else {
            __attbs && __divergences.push(__attbs);
            date = tds[0].textContent.trim();
            const bs = [...tds[1].querySelectorAll('b')];
            const bsStr = [];
            bs.forEach(b => bsStr.push(b.textContent.trim()));
            hours = bsStr.join(' ');
            __attbs = { date, hours, negative: [], positive: [], extra: [] };
            __set(tds, 2);
        }
    }
    return __divergences;
}

function _getTRs(path) {
    const HTML = readFileSync(path);
    const DOM = new JSDOM(HTML);
    return [...DOM.window.document.querySelectorAll('tr')];
}