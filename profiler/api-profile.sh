#!/bin/bash
K=5;    
HTTPSA='https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/register-user'    

date +%M-%S-%N>res
for (( c=1; c<=$K; c++ ))
do
	DATA=`bash register-user-postdata.sh`
    curl -d $DATA -H "Content-Type: application/x-www-form-urlencoded" $HTTPSA
done
date +%M-%S-%N>>res