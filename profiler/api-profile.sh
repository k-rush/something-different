#!/bin/bash
K=5;    
api='https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/'
registeruser="${api}register-user"
login="${api}login"
getthreads="${api}get-threads"  
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
echo $"    Test user expect 200 or 400: "$RESPOSNE | tee -a $LOGFILE
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
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K") | tee -a $LOGFILE


#login
echo $'login\n'
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
echo $'\n  Average time to first byte: '$(bc <<< "scale=3;$SUM/$K") | tee -a $LOGFILE

