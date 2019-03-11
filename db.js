const request = require('request');
const url =  `https://api.mlab.com/api/1/databases/heroku_59xpzcr6/collections/clock-in?apiKey=${process.env.MONGODB_API_KEY}`;

class DB {

    /**
 * Insert data in MongoDB mLab
 *
 * @param {object} doc - Object with divergences
 */
    static insertDoc(doc) {
        return new Promise(resolve => {
            const options = { url, json: true, body: doc };
            request.post(options, (error, res, body) => {
                if (error) throw error;
                resolve(body);
            });
        });
    }

    /**
     * List divergences
     */
    static listDocs() {
        return new Promise(resolve => {
            request(url, (error, res, body) => {
                if (error) throw error;
                resolve(JSON.parse(body));
            });
        });
    }

}

module.exports = DB;