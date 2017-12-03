'use strict';
var crypto = require('crypto');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

/**
 * Validates username and password for Something Different website.
 * To recieve validation token, make post request with 'username' and 
 * 'password' fields that correspond to a registered user.
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

    //Load beta or prod config
    var configuration = {};
    configuration = getConfiguration(event);
    
    var params = {
        TableName : configuration['user-table'],
        KeyConditionExpression: "#username = :user",
        ExpressionAttributeNames:{
            "#username": "username"
        },
        ExpressionAttributeValues: {
            ":user":parsedBody.username
        }
    };


    switch (event.httpMethod) {
        case 'POST':
            
            dynamo.query(params, function(err,data) {
                if(err) {
                    console.log(err);
                    done(err,data);
                }

                else {
                    console.log("QUERY RESULT:" + JSON.stringify(data.Items));
                    if(data.Items.length == 0) {
                        done({message:"Username or password incorrect.", code:"403"},data);
                    }
                    else {
                        const dbHashedPass = data.Items[0].password; // retrieve hashed pw from database
                        
                        //Compute new hash and compare it to the one in DB.
                        const hash = crypto.createHash('sha256');
                        hash.update(parsedBody.password + data.Items[0].salt);
                        if(data.Items[0].password != hash.digest('hex')) {
                            done({message:"Username or password incorrect.", code:"403"},data);
                        }
                        else {
                            //Create new token.
                            var exptime = new Date().getTime() + 3600000; //current time + 1 hour
                            var cipher = crypto.createCipher('aes192',configuration['key']); 
                            var token = cipher.update(JSON.stringify({"username":data.Items[0].username,"expiration":exptime}), 'utf8', 'hex');
                            token += cipher.final('hex');
                            
                            done(null,{"token":token});
                        }
                    }




                    done(null,data);
                    
                }

            });
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }

    //Sets configuration based on dev stage
    var getConfiguration = function(event) {

        var configuration = {};
        if(event.resource.substring(1,5) == 'beta') {
            configuration['stage'] = 'beta';
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
