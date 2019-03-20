const request = require('request');
const URL = `https://api.mlab.com/api/1/databases/${require('../cfg').database}/collections`;
class DB {

    constructor(collection) {
        this.url = `${URL}/${collection}`;
    }

    insertDoc(doc) {
        return new Promise(resolve => {
            const options = { url: this._makeURL(), json: true, body: doc };
            request.post(options, (error, res, body) => {
                if (error) throw error;
                resolve(body);
            });
        });
    }

    listDocs() {
        return new Promise(resolve => {
            request(this._makeURL(), (error, res, body) => {
                if (error) throw error;
                resolve(JSON.parse(body));
            });
        });
    }
    
    deleteDoc(id) {
        this.url = this.url + `/${id}`;
        return new Promise(resolve => {
            request.delete(this._makeURL(), (error, res, body) => {
                if (error) throw error;
                resolve(JSON.parse(body));
            });
        });
    }

    _makeURL() {
        return this.url + `?apiKey=${process.env.MONGODB_API_KEY}`;
    }

}

module.exports = DB;