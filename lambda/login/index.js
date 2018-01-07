'use strict';
var crypto = require('crypto');
var async = require('async');
var waterfall = require('async-waterfall');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

/**
 * Validates username and password for Something Different website.
 * To recieve validation token, make post request with 'username' and 
 * 'password' fields that correspond to a registered user.
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
            //Waterfall:
            // Set sonfiguration
            // Query User DB for username, hashed password
            // Hash Password
            // Check against Queried result
            // Generate token

            waterfall([
                async.apply(setConfiguration, event),
                queryUserDB,
                checkValidatedEmail,
                checkPassword,
                generateToken
                ], done);


            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }

};



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

function queryUserDB(event, configuration, callback) {
    var body = JSON.parse(event.body);
    var queryParams = {
        TableName : configuration['user-table'],
        KeyConditionExpression: "#s = :user",
        ExpressionAttributeNames:{
            "#s": "searchField"
        },
        ExpressionAttributeValues: {
            ":user":body.username.toLowerCase()
        }
    };
    dynamo.query(queryParams, function(err,data) {
        if(err || data.Items.length === 0) {
            console.log(err);
            callback({code:'403', message:'Username or password incorrect'},data);
        }

        else {
            callback(null, event, configuration, data.Items[0]);
        }
    });
}

function checkValidatedEmail(event, configuration, user, callback) {
    console.log("User verified?" + user.verified);
    if(user.verified == false) callback({message:"Admin has not yet verified your account, please be patient", code:"403"});
    else callback(null, event, configuration, user); 
}

function checkPassword(event, configuration, user, callback) {
    var body = JSON.parse(event.body);           
    //Compute new hash and compare it to the one in DB.
    const hash = crypto.createHash('sha256');
    hash.update(body.password + user.salt);
    if(user.password != hash.digest('hex')) {
        console.log("Incorrect password");
        callback({message:"Username or password incorrect.", code:"403"},user);
    }
    else {
        console.log("Username + Password verified");
        callback(null, event, configuration, user);
    }
}

function generateToken(event, configuration, user, callback) {
    //Create new token.
    var exptime = new Date().getTime() + 3600000; //current time + 1 hour
    var cipher = crypto.createCipher('aes192',configuration['key']); 
    var token = cipher.update(JSON.stringify({"username":user.username,"expiration":exptime}), 'utf8', 'hex');
    token += cipher.final('hex');
    
    callback(null,{"token":token});
}