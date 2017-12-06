'use strict';
var crypto = require('crypto');
var waterfall = require('async-waterfall');
var async = require('async');
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

    switch (event.httpMethod) {
        case 'POST':

            //Waterfall:
            // Set configuration
            // Validate token
            // Get threads
            waterfall([
                    async.apply(setConfiguration, event),
                    decipherToken,
                    checkExpTime,
                    queryUserDB,
                    getReplies
                ],
                done);
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }


};


//get discussion threads
function getReplies(body, configuration, callback) {
    var queryParams = {
        TableName : configuration['reply-table'],
        IndexName : configuration['reply-table-index'],
        KeyConditionExpression: "ThreadId = :t",
        ExpressionAttributeValues: {
            ":t":body.threadId
        }
    };

    dynamo.query(queryParams, function(err,data) {
        if(err) {
            console.log("Error while retrieving replies: " + err);
            callback(err,data);
        }

        else {
            callback(null,data.Items);
        }

    });

}

//Sets configuration based on dev stage
function setConfiguration(event, callback) {
    var body = {};
    try { 
        body = JSON.parse(event.body);
    } catch (err) { done({message:"Could not process event body"},null); }
    
    var configuration = {};
    console.log(event.resource.substring(1,5));
    if(event.resource.substring(1,5) == 'beta') {
        configuration['stage'] = 'beta';
        configuration['user-table'] = 'SD-user-beta';
        configuration['reply-table'] = 'SD-reply-beta';
        configuration['thread-table'] = 'SD-thread-beta';
        configuration['reply-table-index'] = 'ThreadId-index';


        var keyQueryParams = {
                TableName : 'SD-beta-key'
        };
        dynamo.scan(keyQueryParams, function(err,data) {
                if(err || data.Items.length === 0) {
                    console.log(err);
                    callback({message:'Internal server error', code:'500'},data);
                }
                else {
                    configuration['key'] = data.Items[0].Key;
                    var emailQueryParams = {
                        TableName : 'SD-beta-sender-email',
                    };

                    dynamo.scan(emailQueryParams, function(err,data) {
                            if(err || data.Items.length === 0) {
                                console.log(err);
                                callback({message:'Internal server error', code:'500'},data);
                            }
                            else {
                                configuration['sender-email'] = data.Items[0].email;
                                callback(null, body, configuration)
                            }
                    });
                }
        });

        
    } else if(event.resource.substring(1,5) == 'prod') {
        configuration['stage'] = 'prod';
        configuration['user-table'] = 'SD-user';
        configuration['reply-table'] = 'SD-reply';
        configuration['thread-table'] = 'SD-thread';
        configuration['reply-table-index'] = 'ThreadId-index';

        var keyQueryParams = {
                TableName : 'SD-beta-key',
        };
        dynamo.scan(keyQueryParams, function(err,data) {
                if(err || data.Items.length === 0) {
                    console.log(err);
                    callback({message:'Internal server error', code:'500'},data);
                }
                else {
                    configuration['key'] = data.Items[0].Key;
                    var emailQueryParams = {
                        TableName : 'SD-sender-email',
                    };

                    dynamo.scan(emailQueryParams, function(err,data) {
                            if(err || data.Items.length === 0) {
                                console.log(err);
                                callback({message:'Internal server error', code:'500'},data);
                            }
                            else {
                                configuration['sender-email'] = data.Items[0].email;
                                callback(null, body, configuration);
                            }
                    });
                }
        });

    } else callback({message:"Invalid resource path", code:'500'});

}


function queryUserDB(body, configuration, token, callback) {
    console.log("queryUserDB() token:" + token.username);
    var queryParams = {
        TableName : configuration['user-table'],
        KeyConditionExpression: "#username = :user",
        ExpressionAttributeNames:{
            "#username": "username"
        },
        ExpressionAttributeValues: {
            ":user":token.username
        }
    };

    dynamo.query(queryParams, function(err,data) {
        if(err) {
            console.log(err);
            callback(err,data);
        }

        else {
            console.log("QUERY RESULT:" + JSON.stringify(data.Items));
            if(data.Items.length === 0) {
                callback({code: '403', message: "Incorrect username"});

            }
            else {
                callback(null,body, configuration);
            }
        }
    });
}

//TODO ... Check to see if token expiration time has exceeded the current time
function checkExpTime(body, configuration, token, callback) {
    callback(null, body, configuration, token);
}

function decipherToken(body, configuration, callback) {
    var token = body.token;
    if(typeof token !== "string") callback({message:"Could not decipher token.", code:'403'});
    console.log("Token: " + token);
    var decipheredToken = "";
    var username = "";
    try { 
        console.log(configuration['key']);
        const decipher = crypto.createDecipher('aes192',configuration['key']);
        decipheredToken = decipher.update(token, 'hex', 'utf8');
        decipheredToken += decipher.final('utf8');
        username = JSON.parse(decipheredToken).username; // Check for valid JSON
        console.log('DECIPHERED TOKEN:' + decipheredToken);
        callback(null, body, configuration, JSON.parse(decipheredToken));
    } catch(err) {
        callback({code: '403', message: "Could not decipher token"});
    }
    
}
