#!/bin/bash
K=5;    
HTTPSA='https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/register-user'    
LOGFILE='./profile_'$(date +%F_%T)

#Test for 200 response
DATA=`bash register-user-postdata.sh`
echo $'register-user\n\tresponse code:\t'`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $HTTPSA` | tee -a $LOGFILE 
curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $HTTPSA  | tee -a $LOGFILE

#Latency test
for (( c=1; c<=$K; c++ ))
do
	DATA=`bash register-user-postdata.sh`
    TIME=`curl -so ./dev/null --write-out "%{time_starttransfer}" -d $DATA -H "Content-Type: application/JSON" $HTTPSA`
    echo $TIME | tee -a $LOGFILE
done
