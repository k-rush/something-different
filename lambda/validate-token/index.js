'use strict';
var crypto = require('crypto');
const key = 'hANtBs3yjrwkgK9g'; //CHANGE IN PRODUCTION SO IT CAN'T BE SCRUBBED FROM GITHUB
const table = 'SD-user';

var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

/**
 * Validates authentication token from client. Strictly used for testing purposes.
 */
exports.handler = (event, context, callback) => {

    const parsedBody = JSON.parse(event.body);
    const done = (err, res) => callback(null, {
        statusCode: err ? (err.code ? err.code : '400') : '200',
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
            var decipheredToken = "";
            var username = "";
            try { 
                const decipher = crypto.createDecipher('aes192',key);
                decipheredToken = decipher.update(token, 'hex', 'utf8');
                decipheredToken += decipher.final('utf8');
                username = JSON.parse(decipheredToken).username; // Check for valid JSON
            } catch(err) {
                callback(null, {statusCode: '403', body: "Could not decipher token", headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}});
            }
            console.log('DECIPHERED TOKEN:' + decipheredToken);

            var queryParams = {
                TableName : table,
                KeyConditionExpression: "#username = :user",
                ExpressionAttributeNames:{
                    "#username": "username"
                },
                ExpressionAttributeValues: {
                    ":user":username
                }
            };

            dynamo.query(queryParams, function(err,data) {
                if(err) {
                    console.log(err);
                    done(err,data);
                }

                else {
                    console.log("QUERY RESULT:" + JSON.stringify(data.Items));
                    if(data.Items.length === 0) {
                        callback(null, {statusCode: '403', body: "Incorrect username", headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}});
            
                    }
                    else {
                        done(null,{username:data.Items[0].username,email:data.Items[0].email,firstname:data.Items[0].firstname,lastname:data.Items[0].lastname,verified:data.Items[0].verified});
                    }
                }
            });

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
