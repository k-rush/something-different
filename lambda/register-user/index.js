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

    const parsedBody = JSON.parse(event.body);

    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('username',JSON.parse(event.body).username);

    //Load beta or prod config
    var configuration = {};
    configuration = getConfiguration(event);
    
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
            //Query DB to see if username exists...

            //Parameters used to query dynamo table for the username
            var queryParams = {
                TableName : configuration['user-table'],
                KeyConditionExpression: "#username = :user",
                ExpressionAttributeNames:{
                    "#username": "username"
                },
                ExpressionAttributeValues: {
                    ":user":parsedBody.username
                }
            };

            console.log("QUERY PARAMS:" + JSON.stringify(queryParams));
            dynamo.query(queryParams, function(err,data) {
                if(err) {
                    console.log(err);
                    done(err,data);
                }

                else {
                    console.log("\n\nQUERY RESULT:" + JSON.stringify(data.Items) + "\n\n + data.Items > 0 =" + (data.Items.length > 0));
                    if(data.Items.length > 0) {
                        done({message:"Username already exists."},data);
                    }
                    else {
                        if(!validateFields(parsedBody)) done({message:"Invalid fields, please validate client-side before sending me shit data, scrub."},data);
                        else {
                            //Salt and hash PW.
                            const hash = crypto.createHash('sha256');
                            const salt = crypto.randomBytes(16).toString('hex');
                            hash.update(parsedBody.password + salt);
                            const hashedPass = hash.digest('hex');

                            console.log("USERNAME: " + parsedBody.username + "HASHED PASSWORD:" + hashedPass + " SALT: " + salt);
                            
                            //Params used to put new user into database
                            var params = {
                                TableName : configuration['user-table'],
                                Item : {"username":parsedBody.username, "password":hashedPass, "salt":salt, "email":parsedBody.email, "firstname":parsedBody.firstname, "lastname":parsedBody.lastname, "verified":false}
                            };
                            
                            var url = generateVerificationURL(parsedBody.username);
                            
                            dynamo.putItem(params, function(err, data) {
                                if(!err) sendVerificationEmail([parsedBody.email], "Email Verification for Something Different's home group website", url);
                            });
                            done(null,data);
                            //NOTE: Email needs to be verified!
                        }
                        
                    }
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
            const decipher = crypto.createDecipher('aes192', key);
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

/** Generates a verificaiton URL to be sent in a verification email.
 *  form: http://<API ENDPOINT>?token=<VERIFICAITON TOKEN>
 */
function generateVerificationURL(username, getConfiguration) {
    var exptime = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); //Set expiration time to current year + 1
    var cipher = crypto.createCipher('aes192',configuration['key']); 

    var token = cipher.update(JSON.stringify({"username":username,"expiration":exptime}), 'utf8', 'hex');
    token += cipher.final('hex');

    return configuration['API'] + "verify-email?token=" + token;
}

function sendVerificationEmail(to, subject, data) {
    var SES = new AWS.SES({apiVersion: '2010-12-01'});
    
    SES.sendEmail( { 
       Source: configuration['sender-email'],
       Destination: { ToAddresses: to },
       Message: {
           Subject: {
              Data: subject
           },
           Body: {
               Text: {
                   Data: data,
               }
            }
       }
    }
    , function(err, data) {
            if(!err) {
                console.log('Email sent:');
                console.log(data);
            }
     });
} 

/** Validates all of the user registration fields */
function validateFields(data) {
    if(!isString(data.username)) && isString(data.firstname) && isString(data.lastname) && validateEmail(data.email) && validatePassword(data.password));                         
}

/** Validates email address */
function validateEmail(email) {  
    return (isString(email) && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email));  
} 

/** Validates password */
function validatePassword(password) {
    return (isString(password) && password.length > 6);
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string');
}