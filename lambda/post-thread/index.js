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
    console.log('username',parsedBody.username);
    
    
    switch (event.httpMethod) {
        case 'POST':
            //Query DB to see if username exists...
            var parsedToken;
            if(!(parsedToken = validateToken(parsedBody.token))) {
                console.log(JSON.stringify(parsedToken));
                done({code:'403', message:'Could not validate token.'});
            }
            else if(!validateFields(parsedBody)) done({message:"Invalid fields, please validate client-side before sending me shit data, scrub."});
            else {
                var params = {
                    TableName : threadTable,
                    Item : {"Subject": parsedBody.subject, "PostedBy":parsedToken.username, "Body":parsedBody.body, "Time":new Date().getTime()}
                };

                dynamo.putItem(params, function(err, data) {
                    done(null,data);
                });
                            
            }
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

function validateToken(token) {
    var decipheredToken = "";
    var username = "";
    try { 
        const decipher = crypto.createDecipher('aes192',key);
        decipheredToken = decipher.update(token, 'hex', 'utf8');
        decipheredToken += decipher.final('utf8');
        username = JSON.parse(decipheredToken).username; // Check for valid JSON
    } catch(err) {
        return false;
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
            return false;
        }

        else {
            console.log("QUERY RESULT:" + JSON.stringify(data.Items));
            if(data.Items.length === 0) {
                return false;
            }
            else {
                return {username:data.Items[0].username,email:data.Items[0].email,firstname:data.Items[0].firstname,lastname:data.Items[0].lastname,verified:data.Items[0].verified};
            }
        }
    });
}

function validateFields(data) {
    return (isString(data.username) && isString(data.message)&& isString(data.subject));                         
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string');
}