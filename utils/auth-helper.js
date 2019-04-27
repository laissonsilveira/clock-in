const DBHelper = require('./db');
const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function authentication(req, res, next) {
    const authData = _decode(req.headers.authorization).split(':');
    const db = new DBHelper('users');
    db.listDocs()
        .then(users => {
            let userFound;
            if (users && Array.isArray(users) && users.length > 0) {
                userFound = users.find(user => authData[0] === user.username && authData[1] === user.password);
            }

            if (!userFound) {
                const err = new Error();
                err.status = 403;
                next(err);
            } else {
                next();
            }
        })
        .catch(err => next(err));
}

function _decode(input) {
    let output = '';
    let chr1, chr2, chr3 = '';
    let enc1, enc2, enc3, enc4 = '';
    let i = 0;

    input = input.replace('Basic ', '').replace(/[^A-Za-z0-9+/=]/g, '');

    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }

        chr1 = chr2 = chr3 = '';
        enc1 = enc2 = enc3 = enc4 = '';

    } while (i < input.length);

    return output;
}

module.exports = { authentication };