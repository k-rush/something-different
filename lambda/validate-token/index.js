'use strict';
var crypto = require('crypto');
console.log('Loading function');
const key = 'hANtBs3yjrwkgK9g'; //CHANGE IN PRODUCTION SO IT CAN'T BE SCRUBBED FROM GITHUB


/**
 * Validates authentication token from client. Strictly used for testing purposes.
 */
exports.handler = (event, context, callback) => {

    const parsedBody = JSON.parse(event.body);
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
    

    switch (event.httpMethod) {
        case 'POST':
            const token = JSON.parse(event.body).token;
            console.log("Token: " + token);
            const decipher = crypto.createDecipher('aes192',key);
            var decipheredToken = decipher.update(token, 'hex', 'utf8');
            decipheredToken += decipher.final('utf8');
            console.log('DECIPHERED TOKEN:' + decipheredToken);
            done(null,JSON.parse(decipheredToken));

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
