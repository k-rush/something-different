'use strict';
var crypto = require('crypto');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

/**
 * Validates authentication token from client.
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
    
    //Load beta or prod config
    var configuration = {};
    configuration = getConfiguration(event);

    switch (event.httpMethod) {
        case 'GET':
            const token = event.queryStringParameters.token;
            console.log("Token: " + token);
            const decipher = crypto.createDecipher('aes192',configuration['key']);
            var decipheredToken = "";
            var parsedToken = "";
            try {
                decipheredToken = decipher.update(token, 'hex', 'utf8');
                decipheredToken += decipher.final('utf8');
                console.log('DECIPHERED TOKEN:' + decipheredToken);
                parsedToken = JSON.parse(decipheredToken);
            } catch (err) {
                callback(null, {statusCode: '403', body: "Could not decipher token", headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}});
            }
            
            
            var params = {
                TableName:configuration['user-table'],
                Key:{
                    "username":parsedToken.username
                },
                UpdateExpression: "set verified = :v",
                ExpressionAttributeValues:{
                    ":v":true
                },
                ReturnValues:"UPDATED_NEW"
            };

            dynamo.updateItem(params, function(err, data) {
                if (err) {
                    done(err,null);
                    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                    done(null,"Email succesfully validated.");
                }
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
                        done({message:'Internal server error', code:'500'},data);
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
                        done({message:'Internal server error', code:'500'},data);
                    }
                    else {
                        configuration['sender-email'] = data.Items[0].email;
                    }
            });

        } else done({message:"Invalid resource path", code:'403'});

        return configuration;
    };


};
