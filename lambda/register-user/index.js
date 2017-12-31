'use strict';
var crypto = require('crypto');
var async = require('async');
var waterfall = require('async-waterfall');
var AWS = require('aws-sdk');
var validator = require('validator');
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

    try { 
        JSON.parse(event.body);
    } catch (err) { done({message:"Could not process event body"},null); }

    
    switch (event.httpMethod) {
        case 'POST':

            //Waterfall..
            // Set configuration
            // Validate other fields
            // Check if username exists in DB
            // Salt & hash password
            // Put new user in DB
            // generate verification email
            // send verification email

            waterfall([
                async.apply(setConfiguration, event),
                validateFields,
                sanitizeFields,
                queryUserDB,
                saltAndHashPW,
                putNewUser,
                generateVerificationURL,
                sendVerificationEmail
                ], done);

            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }

};

/** Generates a verificaiton URL to be sent in a verification email.
 *  form: http://<API ENDPOINT>?token=<VERIFICAITON TOKEN>
 */
function generateVerificationURL(body, configuration, callback) {
    var exptime = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); //Set expiration time to current year + 1
    var cipher = crypto.createCipher('aes192',configuration['key']); 

    var token = cipher.update(JSON.stringify({"username":body.username,"expiration":exptime}), 'utf8', 'hex');
    token += cipher.final('hex');
    var emailBody = configuration['API'] + "verify-email?token=" + token;
    callback(null, body, configuration, emailBody);
}

function sendVerificationEmail(body, configuration, emailBody, callback) {
    var SES = new AWS.SES({apiVersion: '2010-12-01'});
    SES.sendEmail( { 
       Source: configuration['sender-email'],
       Destination: { ToAddresses: [body.email] },
       Message: {
           Subject: {
              Data: configuration['email-subject']
           },
           Body: {
               Text: {
                   Data: emailBody,
               }
            }
       }
    }
    , function(err, data) {
            if(!err) {
                console.log('Email sent:');
                console.log(data);
                callback(null, body);
            }
            else {
                console.log(err);
                callback({code:500, message:'Error while sending verification email.'});
            }
     });
} 

/** Validates all of the user registration fields */
function validateFields(body, configuration, callback) {
    if(isString(body.username) && isString(body.firstname) && isString(body.lastname) && validator.isEmail(body.email) && validatePassword(body.password))
        callback(null, body, configuration);
    else callback({message: 'Invalid registration inputs', code:'400'});                         
}

/** Sanitize inputs for html */
function sanitizeFields(body, configuration, callback) {
    body.username = validator.escape(validator.trim(body.username));
    body.firstname = validator.escape(body.firstname);
    body.lastname = validator.escape(body.lastname);
    body.email = validator.normalizeEmail(validator.escape(body.email));
    callback(null, body, configuration);
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
    return (typeof data === 'string' && 0 !== data.length);
}


//Sets configuration based on dev stage
function setConfiguration(event, callback) {

    var configuration = {};
    configuration['email-subject'] = 'Validate your email with the Something Different home group website!';
    if(event.resource.substring(1,5) == 'beta') {
        configuration['stage'] = 'beta';
        configuration['user-table'] = 'SD-user-beta';
        configuration['API'] = 'https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/';



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
                                callback(null, JSON.parse(event.body), configuration)
                            }
                    });
                }
        });

        
    } else if(event.resource.substring(1,5) == 'prod') {
        configuration['stage'] = 'prod';
        configuration['user-table'] = 'SD-user';
        configuration['API'] = 'https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/prod/';

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
                                callback(null, JSON.parse(event.body), configuration);
                            }
                    });
                }
        });

    } else callback({message:"Invalid resource path", code:'500'});

}

function queryUserDB(body, configuration, callback) {
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
        if(err) {
            console.log(err);
            callback(err,data);
        }

        else {
            console.log("QUERY RESULT:" + JSON.stringify(data.Items));
            if(data.Items.length === 0) {
                callback(null, body, configuration);

            }
            else {
                callback({message: 'Username already exists'});
            }
        }
    });
}

//Salt and hash PW.
function saltAndHashPW(body, configuration, callback) {
    const hash = crypto.createHash('sha256');
    const salt = crypto.randomBytes(16).toString('hex');
    hash.update(body.password + salt);
    const hashedPass = hash.digest('hex');

    console.log("USERNAME: " + body.username + "HASHED PASSWORD:" + hashedPass + " SALT: " + salt);
    callback(null, body, configuration, hashedPass, salt);                      
}

function putNewUser(body, configuration, hashedPass, salt, callback) {
    //Params used to put new user into database
    console.log("Putting user into DB");
    var params = {
        TableName : configuration['user-table'],
        Item : {"username":body.username, "password":hashedPass, "salt":salt, "email":body.email, "firstname":body.firstname, "lastname":body.lastname, "verified":false, "searchField":body.username.toLowerCase()}
    };
    dynamo.putItem(params, function(err, data) {
        if(!err) {
            console.log("User put into DB\n" + data);
            callback(null, body, configuration);
        }
        else {
            console.log(err + "\n" + data);
            callback({code:'500', message:"Error putting user into database."});
        }
    });
}