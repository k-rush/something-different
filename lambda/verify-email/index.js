'use strict';
var crypto = require('crypto');
const doc = require('dynamodb-doc');
var waterfall = require('async-waterfall');
var async = require('async');
const dynamo = new doc.DynamoDB();

/**
 * Will verify a token emailed to user upon registration.
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
        case 'GET':

            //Waterfall
            // Set config
            // decipher token
            // update DB entry

            waterfall([
                async.apply(setConfiguration, event),
                decipherToken,
                updateUser
                ], done);

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }


};

//TODO ... Check to see if token expiration time has exceeded the current time
function checkExpTime(event, configuration, token, callback) {
    callback(null, event, configuration, token);
}

//Decipher verification token
function decipherToken(event, configuration, callback) {
    const token = event.queryStringParameters.token;
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
        callback(null, event, configuration, JSON.parse(decipheredToken));
    } catch(err) {
        callback({code: '403', message: "Could not decipher token"});
    }
    
}

function updateUser(event, configuration, token, callback) {
    var params = {
        TableName:configuration['user-table'],
        Key:{
            "username":token.username
        },
        UpdateExpression: "set verified = :v",
        ExpressionAttributeValues:{
            ":v":true
        },
        ReturnValues:"UPDATED_NEW"
    };

    dynamo.updateItem(params, function(err, data) {
        if (err) {
            err.code = '500';
            console.error("Unable to update item. Error:", JSON.stringify(err, null, 2));
            callback(err,null);
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            callback(null,"Email succesfully validated.");
        }
    });

}

//Sets configuration based on dev stage
function setConfiguration(event, callback) {

    var configuration = {};
    
    if(event.resource.substring(1,5) == 'beta') {
        configuration['stage'] = 'beta';
        configuration['user-table'] = 'SD-user-beta';


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