#!/bin/bash
K=5;    
api='https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/'
registeruser="${api}register-user"
login="${api}login"
getthreads="${api}get-threads" 
getusers="${api}get-users" 
LOGFILE='./logfiles/'$(date +%F_%T)

#register-user
#Test for 200 response
DATA=`bash register-user-postdata.sh`
echo $'register-user\n  response codes:' | tee -a $LOGFILE

RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $registeruser`
echo $'    Valid inputs, expect 200: '$RESPONSE | tee -a $LOGFILE 

RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $registeruser`
echo $'    Replicate username, expect 400: '$RESPONSE  | tee -a $LOGFILE

#register a testuser
DATA=`bash register-user-postdata.sh -t`
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $registeruser`
echo $'    Test user, expect 200 or 400: '$RESPONSE | tee -a $LOGFILE

#test invalid inputs
DATA=`bash register-user-postdata.sh -i`
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $registeruser`
echo $'    Invalid inputs, expect 400: '$RESPONSE  | tee -a $LOGFILE

#Latency test
SUM=0
for (( c=1; c<=$K; c++ ))
do
	DATA=`bash register-user-postdata.sh`
    TIME=`curl -so ./dev/null --write-out "%{time_starttransfer}" -d $DATA -H "Content-Type: application/JSON" $registeruser`
    SUM=$(bc <<< "$TIME + $SUM")
done
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K")$'\n' | tee -a $LOGFILE


#login
echo $'login\n  response codes:'
DATA=`bash login-postdata.sh`
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $login`
echo $'    Valid inputs, expect 200: '$RESPONSE | tee -a $LOGFILE
if [ $RESPONSE -eq 200 ]
then
	TOKENDATA=`curl -s -d $DATA -H "Content-Type: application/JSON" $login`
else
	TOKENDATA=0
fi

DATA=`bash login-postdata.sh -i`
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $login`
echo $'    Invalid inputs, expect 403: '$RESPONSE | tee -a $LOGFILE

#Latency test
SUM=0
for (( c=1; c<=$K; c++ ))
do
	DATA=`bash login-postdata.sh`
    TIME=`curl -so ./dev/null --write-out "%{time_starttransfer}" -d $DATA -H "Content-Type: application/JSON" $login`
    SUM=$(bc <<< "$TIME + $SUM")
done
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K")$'\n' | tee -a $LOGFILE

#get-users
echo $'get-users\n  response codes:'
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $TOKENDATA -H "Content-Type: application/JSON" $getusers`
echo $'    Valid token, expect 200: '$RESPONSE | tee -a $LOGFILE
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $getusers`
echo $'    Invalid token, expect 403: '$RESPONSE | tee -a $LOGFILE

#Latency test
SUM=0
for (( c=1; c<=$K; c++ ))
do
    TIME=`curl -so ./dev/null --write-out "%{time_starttransfer}" -d $TOKENDATA -H "Content-Type: application/JSON" $getusers`
    SUM=$(bc <<< "$TIME + $SUM")
done
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K")$'\n' | tee -a $LOGFILE

#get-threads
echo $'get-threads\n  response codes:'
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $TOKENDATA -H "Content-Type: application/JSON" $getthreads`
echo $'    Valid token, expect 200: '$RESPONSE | tee -a $LOGFILE
RESPONSE=`curl -so ./dev/null --write-out "%{http_code}" -d $DATA -H "Content-Type: application/JSON" $getthreads`
echo $'    Invalid token, expect 403: '$RESPONSE | tee -a $LOGFILE

#Latency test
SUM=0
for (( c=1; c<=$K; c++ ))
do
    TIME=`curl -so ./dev/null --write-out "%{time_starttransfer}" -d $TOKENDATA -H "Content-Type: application/JSON" $getthreads`
    SUM=$(bc <<< "$TIME + $SUM")
done
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K")$'\n' | tee -a $LOGFILE

