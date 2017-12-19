#!/bin/bash

#remove zip
echo "REMOVING PERVIOUS DEPLOYMENT PACKAGES"

rm login.zip register-user.zip verify-email.zip get-users.zip post-thread.zip get-threads.zip  post-reply.zip get-replies.zip

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

pushd /home/kyle/Documents/code/something-different/lambda/post-thread
zip -r ../post-thread.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/get-threads
zip -r ../get-threads.zip *
popd


pushd /home/kyle/Documents/code/something-different/lambda/post-reply
zip -r ../post-reply.zip *
popd

pushd /home/kyle/Documents/code/something-different/lambda/get-replies
zip -r ../get-replies.zip *
popd

#delpoy
echo "DEPLOYING PACKAGES TO AWS LAMBDA"
aws lambda update-function-code --function-name SD-login --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/login.zip
aws lambda update-function-code --function-name SD-register-user --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/register-user.zip
aws lambda update-function-code --function-name SD-verify-email --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/verify-email.zip
aws lambda update-function-code --function-name SD-validate-token --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/validate-token.zip
aws lambda update-function-code --function-name SD-get-users --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-users.zip
aws lambda update-function-code --function-name SD-post-thread --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/post-thread.zip
aws lambda update-function-code --function-name SD-get-threads --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-threads.zip
aws lambda update-function-code --function-name SD-post-reply --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/post-reply.zip
aws lambda update-function-code --function-name SD-get-replies --zip-file fileb:///home/kyle/Documents/code/something-different/lambda/get-replies.zip