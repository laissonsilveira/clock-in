const request = require('request');
const URL = `https://api.mlab.com/api/1/databases/${require('../cfg').database}/collections`;
class DB {

    constructor(collection) {
        this.url = `${URL}/${collection}?apiKey=${process.env.MONGODB_API_KEY}`;
    }

    insertDoc(doc) {
        return new Promise(resolve => {
            const options = { url: this.url, json: true, body: doc };
            request.post(options, (error, res, body) => {
                if (error) throw error;
                resolve(body);
            });
        });
    }

    listDocs() {
        return new Promise(resolve => {
            request(this.url, (error, res, body) => {
                if (error) throw error;
                resolve(JSON.parse(body));
            });
        });
    }

}

module.exports = DB;