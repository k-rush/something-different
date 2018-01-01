'use strict';
var crypto = require('crypto');
var AWS = require('aws-sdk');
var waterfall = require('async-waterfall');
var async = require('async');
var validator = require('validator');
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

    
    
    switch (event.httpMethod) {
        case 'POST':

            //Waterfall:
            // Validate token
            // Validate fields
            // Sanitize inputs
            // Put reply into DB
            waterfall([
                async.apply(setConfiguration, event),
                decipherToken,
                checkExpTime,
                queryUserDB,

                validateFields,
                sanitizeFields,
                putThread
                ],
                done);
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }


};


function validateFields(body, configuration, username, callback) {
    console.log("Validate Fields");
    if (isString(username) && isString(body.body)&& isString(body.subject)) 
        callback(null, body, configuration, username);
    
    else callback({message:"Invalid fields."});                         
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string' && 0 !== data.length);
}


//Sets configuration based on dev stage
function setConfiguration(event, callback) {
    var body = {};
    try { 
        body = JSON.parse(event.body);
    } catch (err) { callback({message:"Could not process event body", code:'500'},null); }
    

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
                                callback(null, body, configuration)
                            }
                    });
                }
        });

        
    } else if(event.resource.substring(1,5) == 'prod') {
        configuration['stage'] = 'prod';
        configuration['user-table'] = 'SD-user';
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
        KeyConditionExpression: "#s = :user",
        ExpressionAttributeNames:{
            "#s": "searchField"
        },
        ExpressionAttributeValues: {
            ":user":token.username.toLowerCase()
        }
    };

    dynamo.query(queryParams, function(err,data) {
        if(err) {
            console.log(err);
            callback(err,data);
        }

        else {
            console.log("USER DB QUERY RESULT:" + JSON.stringify(data.Items));
            if(data.Items.length === 0) {
                callback({code: '403', message: "Incorrect username"});
            }
            else {
                console.log("Succesful query." + callback);
                callback(null,body, configuration, data.Items[0].username);
            }
        }
    });
}

//TODO ... Check to see if token expiration time has exceeded the current time
function checkExpTime(body, configuration, token, callback) {
    var timeString = new Date().getTime().toString();
    callback(null, body, configuration, token);
}

function decipherToken(body, configuration, callback) {
    const token = body.token;
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


/** Sanitize inputs for html */
function sanitizeFields(body, configuration, username, callback) {
    username = validator.escape(username);
    body.subject = validator.escape(body.subject);
    body.body = validator.escape(body.body);
    callback(null, body, configuration, username);
}

function putThread(body, configuration, username, callback) {
    var timeString = new Date().getTime().toString();
    var uuid = uuidv1();
    var params = {
        TableName : configuration['thread-table'],
        Item : {"Id":uuid, "Subject": body.subject, "PostedBy":username, "Body":body.body, "Time":timeString}
    };

    dynamo.putItem(params, function(err, data) {
        callback(err,data);
    });
}