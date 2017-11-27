#!/bin/bash

#remove zip
echo "REMOVING PERVIOUS DEPLOYMENT PACKAGES"

rm login.zip register-user.zip verify-email.zip get-users.zip post-message.zip

#make new zip
echo "ZIPPING DEPLOYMENT PACKAGES"

pushd /home/kyle/Documents/code/something-different/lambda/login
zip -r ../login.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/register-user
zip -r ../register-user.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/verify-email
zip -r ../verify-email.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/validate-token
zip -r ../validate-token.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/get-users
zip -r ../get-users.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/post-message
zip -r ../post-message.zip *
popd

#delpoy
echo "DEPLOYING PACKAGES TO AWS LAMBDA"
aws lambda update-function-code --function-name SD-login --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/login.zip
aws lambda update-function-code --function-name SD-register-user --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/register-user.zip
aws lambda update-function-code --function-name SD-verify-email --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/verify-email.zip
aws lambda update-function-code --function-name SD-validate-token --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/validate-token.zip
aws lambda update-function-code --function-name SD-get-users --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-users.zip
aws lambda update-function-code --function-name SD-post-message --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/post-message.zip
