'use strict';
var crypto = require('crypto');
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

//CHANGE THESE
const userTable = 'SD-user';
const reply = 'SD-reply';
const threadTable = 'SD-thread';
const senderEmail = 'kdr213@gmail.com';
const API = "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/";
const key = 'hANtBs3yjrwkgK9g'; //TODO CHANGE THIS IN PRODUCTION SO IT CAN'T BE SCRUBBED FROM GITHUB

/**
 * Registers new user.
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

    var parsedBody;
    try { 
        parsedBody = JSON.parse(event.body);
    } catch (err) { done({message:"Could not process event body"},null); }
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    
    switch (event.httpMethod) {
        case 'POST':
            //Query DB to see if username exists...

            validateToken(parsedBody.token, function(data) {
                if(!data) done({code:'403', message:'Could not validate token.'});

                var timeString = new Date().getTime().toString();

                console.log("\nPARSED BODY:" + parsedBody.subject + " " + data.username + " " + parsedBody.body + " " + timeString);
                

                var scanParams = {
                    TableName: threadTable,
                    ProjectionExpression: "PostedBy, Subject, Body, #t",
                    ExpressionAttributeNames: {
                        "#t": "Time",
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
                            
            });
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

function validateToken(token, callback) {
    var decipheredToken = "";
    var username = "";
    try { 
        const decipher = crypto.createDecipher('aes192',key);
        decipheredToken = decipher.update(token, 'hex', 'utf8');
        decipheredToken += decipher.final('utf8');
        username = JSON.parse(decipheredToken).username; // Check for valid JSON
    } catch(err) {
        callback(null);
    }
    console.log('DECIPHERED TOKEN:' + decipheredToken);

    var queryParams = {
        TableName : userTable,
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
            callback(null);
        }

        else {
            console.log("QUERY RESULT:" + JSON.stringify(data.Items));
            if(data.Items.length === 0) {
                callback(null);
            }
            else {
                callback({username:data.Items[0].username,email:data.Items[0].email,firstname:data.Items[0].firstname,lastname:data.Items[0].lastname,verified:data.Items[0].verified});
            }
        }
    });
}
