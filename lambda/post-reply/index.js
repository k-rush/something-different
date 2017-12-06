'use strict';
var crypto = require('crypto');
var AWS = require('aws-sdk');
var waterfall = require('async-waterfall');
var async = require('async');
const uuidv1 = require('uuid/v1');
AWS.config.update({region: 'us-west-2'});

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

/**
 * Registers new user.
 */
exports.handler = (event, context, callback) => {

    console.log('Received event:', JSON.stringify(event, null, 2));
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

            //Waterfall:
            // Validate token
            // Validate fields
            // Sanitize inputs
            // Put thread into DB
            waterfall([
                async.apply(setConfiguration, event),
                decipherToken,
                checkExpTime,
                queryUserDB,

                validateFields,
                sanitizeInputs,
                putReply
                ],
                done);
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }


};


function validateFields(event, configuration, username, callback) {
    var body = JSON.parse(event.body);
    console.log(body.threadId + "  " + username + " " + body.body);
    if (isString(body.threadId) && isString(username) && isString(body.body)) {
            //Check if thread ID matches thread in DB...
        var queryParams = {
            TableName : configuration['thread-table'],
            KeyConditionExpression: "#i = :id",
            ExpressionAttributeNames:{
                "#i": "Id"
            },
            ExpressionAttributeValues: {
                ":id":body.threadId
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
                    callback({code: '400', message: "Invalid threadId"});

                }
                else {
                    callback(null, event, configuration, username);
                }
            }
        });
    
    }
    else callback({message:"Invalid fields."});                         
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string');
}


//Sets configuration based on dev stage
function setConfiguration(event, callback) {

    var configuration = {};
    
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
                                callback(null, event, configuration)
                            }
                    });
                }
        });

        
    } else if(event.resource.substring(1,5) == 'prod') {
        configuration['stage'] = 'prod';
        configuration['user-table'] = 'SD-user';
        configuration['reply-table'] = 'SD-reply';
        configuration['thread-table'] = 'SD-thread';

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
                                callback(null, event, configuration);
                            }
                    });
                }
        });

    } else callback({message:"Invalid resource path", code:'500'});

}

function queryUserDB(event, configuration, token, callback) {
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
                callback(null,event, configuration, data.Items[0].username);
            }
        }
    });
}

//TODO ... Check to see if token expiration time has exceeded the current time
function checkExpTime(event, configuration, token, callback) {
    var timeString = new Date().getTime().toString();
    callback(null, event, configuration, token);
}

function decipherToken(event, configuration, callback) {
    const token = JSON.parse(event.body).token;
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
        callback(null, event, configuration, JSON.parse(decipheredToken));
    } catch(err) {
        callback({code: '403', message: "Could not decipher auth token"});
    }
    
}

//TODO Sanitize inputs
function sanitizeInputs(event, configuration, username, callback) {
    callback(null, event, configuration, username);
}

function putReply(event, configuration, username, callback) {
    var timeString = new Date().getTime().toString();
    var body = JSON.parse(event.body);
    var uuid = uuidv1();
    var params = {
        TableName : configuration['reply-table'],
        Item : {"Id":uuid, "ThreadId": body.threadId, "PostedBy":username, "Body":body.body, "Time":timeString}
    };

    dynamo.putItem(params, function(err, data) {
        callback(err,data);
    });
}