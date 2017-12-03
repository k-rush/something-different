#!/bin/bash

#remove zip
echo "REMOVING PERVIOUS DEPLOYMENT PACKAGES"

rm login-beta.zip register-user-beta.zip verify-email-beta.zip get-users-beta.zip post-thread-beta.zip get-threads-beta.zip

#make new zip
echo "ZIPPING DEPLOYMENT PACKAGES"

pushd /home/kyle/Documents/code/something-different/lambda/login
zip -r ../login-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/register-user
zip -r ../register-user-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/verify-email
zip -r ../verify-email-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/validate-token
zip -r ../validate-token-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/get-users
zip -r ../get-users-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/post-thread
zip -r ../post-thread-beta.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/get-threads
zip -r ../get-threads-beta.zip *
popd

#delpoy
echo "DEPLOYING PACKAGES TO AWS LAMBDA"
aws lambda update-function-code --function-name SD-login-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/login-beta.zip
aws lambda update-function-code --function-name SD-register-user-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/register-user-beta.zip
aws lambda update-function-code --function-name SD-verify-email-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/verify-email-beta.zip
aws lambda update-function-code --function-name SD-validate-token-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/validate-token-beta.zip
aws lambda update-function-code --function-name SD-get-users-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-users-beta.zip
aws lambda update-function-code --function-name SD-post-thread-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/post-thread-beta.zip
aws lambda update-function-code --function-name SD-get-threads-beta --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-threads-beta.zip