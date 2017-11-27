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
            var username;
            var parsedBody;

            try {
                parsedBody = JSON.parse(event.body);
                const token = parsedBody.token;
                console.log("Token: " + token);
                const decipher = crypto.createDecipher('aes192',key);
                var decipheredToken = decipher.update(token, 'hex', 'utf8');
                decipheredToken += decipher.final('utf8');
                console.log('DECIPHERED TOKEN:' + decipheredToken);
            } catch(err) {
                callback(null, {statusCode: '403', body: "Could not decipher token", headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}});
            }
            
            username = JSON.parse(decipheredToken).username;

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
                        done({message:"Username or password incorrect."},data);
                    }
                    else {
                        var scanParams = {
                            TableName: table,
                            ProjectionExpression: "#u, firstname, lastname, email, verified",
                            ExpressionAttributeNames: {
                                "#u": "username",
                            }
                        };
                        dynamo.scan(scanParams, function(err,data) {
                            if(err) {
                                console.log(err);
                                done(err,data);
                            }

                            else {
                                done(null,data.Items);
                            }
                    
                        });
                    }
                }
            });

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
