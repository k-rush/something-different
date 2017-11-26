'use strict';
var crypto = require('crypto');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

const key = 'hANtBs3yjrwkgK9g'; //CHANGE THIS IN PRODUCTION SO IT CAN'T BE SCRUBBED FROM GITHUB
const table = 'SD-user';
/**
 * Validates username and password for Something Different website.
 * To recieve validation token, make post request with 'username' and 
 * 'password' fields that correspond to a registered user.
 */
exports.handler = (event, context, callback) => {
    
    
    const parsedBody = JSON.parse(event.body);

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
    
    var params = {
        TableName : table,
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
                        done({message:"Username or password incorrect."},data);
                    }
                    else {
                        const dbHashedPass = data.Items[0].password; // retrieve hashed pw from database
                        
                        //Compute new hash and compare it to the one in DB.
                        const hash = crypto.createHash('sha256');
                        hash.update(parsedBody.password + data.Items[0].salt);
                        if(data.Items[0].password != hash.digest('hex')) {
                            done({message:"Username or password incorrect."},data);
                        }
                        else {
                            //Create new token.
                            var exptime = new Date().getTime() + 3600000; //current time + 1 hour
                            var cipher = crypto.createCipher('aes192',key); 
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
};
