'use strict';
var crypto = require('crypto');
var waterfall = require('async-waterfall');
var async = require('async');
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

    try { 
        JSON.parse(event.body);
    } catch (err) { done({message:"Could not process event body"},null); }


    switch (event.httpMethod) {
        case 'POST':

            // Waterfall:
            // Get configuration
            // Validate token
            // Scan user database



            
            validateToken(parsedBody.token, configuration['key'], function(userData) {

                var queryParams = {
                    TableName : configuration['user-table'],
                    KeyConditionExpression: "#username = :user",
                    ExpressionAttributeNames:{
                        "#username": "username"
                    },
                    ExpressionAttributeValues: {
                        ":user":userData.username
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
                            done({message:"No users"},data);
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
            });

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }

    
    //Sets configuration based on dev stage
    function getConfiguration(event) {

        var configuration = {};
        console.log(event.resource.substring(1,5));
        if(event.resource.substring(1,5) == 'beta') {
            configuration['stage'] = 'beta';
            configuration['user-table'] = 'SD-user-beta';
            configuration['reply-table'] = 'SD-reply-beta';
            configuration['thread-table'] = 'SD-thread-beta';


            var keyQueryParams = {
                    TableName : 'SD-beta-key'
            };
            dynamo.scan(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Internal server error', code:'500'},data);
                    }
                    else {
                        configuration['key'] = data.Items[0].Key;
                    }
            });

            keyQueryParams = {
                    TableName : 'SD-beta-sender-email'
            };

            dynamo.scan(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Internal server error', code:'500'},data);
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
            dynamo.scan(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Internal server error', code:'403'},data);
                    }
                    else {
                        configuration['key'] = data.Items[0].Key;
                    }
            });
            keyQueryParams = {
                    TableName : 'SD-sender-email',
            };

            dynamo.scan(keyQueryParams, function(err,data) {
                    if(err || data.Items.length === 0) {
                        console.log(err);
                        done({message:'Internal server error', code:'403'},data);
                    }
                    else {
                        configuration['sender-email'] = data.Items[0].email;
                    }
            });

        } else done({message:"Invalid resource path", code:'403'});

        return configuration;
    };



    function validateToken(token, key, callback) {
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
