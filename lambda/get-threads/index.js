'use strict';
var crypto = require('crypto');
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();



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
    //Load beta or prod config
    var configuration = {};
    configuration = getConfiguration(event);
    
    switch (event.httpMethod) {
        case 'POST':
        
            validateToken(parsedBody.token, configuration['key'], function(data) {
                if(!data) done({code:'403', message:'Could not validate token.'});

                var timeString = new Date().getTime().toString();

                console.log("\nPARSED BODY:" + parsedBody.subject + " " + data.username + " " + parsedBody.body + " " + timeString);
                

                var scanParams = {
                    TableName: configuration['thread-table'],
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

    //Sets configuration based on dev stage
    var getConfiguration = function(event) {

        var configuration = {};
        if(event.resource.substring(1,5) == 'beta') {
            configuration['stage'] = "beta";
            configuration['user-table'] = 'SD-user-beta';
            configuration['reply-table'] = 'SD-reply-beta';
            configuration['thread-table'] = 'SD-thread-beta';


            var keyQueryParams = {
                    TableName : 'SD-beta-key',
            };
            dynamo.query(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Could not retreive crypto key from DB', code:'403'},data);
                    }
                    else {
                        configuration['key'] = data.Items[0].Key;
                    }
            });

            keyQueryParams = {
                    TableName : 'SD-beta-sender-email',
            };

            dynamo.query(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Could not retreive sender email from DB', code:'403'},data);
                    }
                    else {
                        configuration['sender-email'] = data.Items[0].email;
                    }
            });
        } else if(event.resource.substring(1,5) == 'prod') {
            configuration['stage'] = 'prod';
            configuration['user-table'] = 'SD-user';

            var keyQueryParams = {
                    TableName : 'SD-beta-key',
            };
            dynamo.query(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Could not retreive crypto key from DB', code:'403'},data);
                    }
                    else {
                        configuration['key'] = data.Items[0].Key;
                    }
            });
            keyQueryParams = {
                    TableName : 'SD-sender-email',
            };

            dynamo.query(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Could not retreive sender email from DB', code:'403'},data);
                    }
                    else {
                        configuration['sender-email'] = data.Items[0].email;
                    }
            });

        } else done({message:"Invalid resource path", code:'403'});

        return configuration;
    };



    var validateToken = function(token, key, callback) {
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
            TableName : configuration['user-table'],
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

};
