'use strict';
var crypto = require('crypto');
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

//CHANGE THESE
const table = 'SD-user';
const senderEmail = 'kdr213@gmail.com';
const API = "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/";
const key = 'hANtBs3yjrwkgK9g'; //TODO CHANGE THIS IN PRODUCTION SO IT CAN'T BE SCRUBBED FROM GITHUB

/**
 * Registers new user.
 */
exports.handler = (event, context, callback) => {

    const parsedBody = JSON.parse(event.body);

    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('username',JSON.parse(event.body).username);
    
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
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
                TableName : table,
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

                            //TODO validate password, username, email, names are not null

                            const hash = crypto.createHash('sha256');
                            const salt = crypto.randomBytes(16).toString('hex');
                            hash.update(parsedBody.password + salt);
                            const hashedPass = hash.digest('hex');

                            console.log("USERNAME: " + parsedBody.username + "HASHED PASSWORD:" + hashedPass + " SALT: " + salt);
                            
                            //Params used to put new user into database
                            var params = {
                                TableName : table,
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
};

/** Generates a verificaiton URL to be sent in a verification email.
 *  form: http://<API ENDPOINT>?token=<VERIFICAITON TOKEN>
 */
function generateVerificationURL(username) {
    var exptime = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); //Set expiration time to current year + 1
    var cipher = crypto.createCipher('aes192',key); 

    var token = cipher.update(JSON.stringify({"username":username,"expiration":exptime}), 'utf8', 'hex');
    token += cipher.final('hex');

    //TODO Don't hard-code your API endpoint.
    return API + "verify-email?token=" + token;
}

function sendVerificationEmail(to, subject, data) {
    var SES = new AWS.SES({apiVersion: '2010-12-01'});
    
    SES.sendEmail( { 
       Source: senderEmail,
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
    return (isString(data.username) && isString(data.firstname) && isString(data.lastname) && validateEmail(data.email) && validatePassword(data.password));                         
}

/** Validates email address */
function validateEmail(email) {  
    return (isString(email) && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))  
} 

/** Validates password */
function validatePassword(password) {
    return (isString(password) && password.length > 6)
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string');
}