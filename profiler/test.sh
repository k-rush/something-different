api='https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/'
registeruser="${api}register-user"
login="${api}login"

DATA=`bash login-postdata.sh`
echo `curl -d $DATA -H "Content-Type: application/JSON" $login` | tee -a $LOGFILE 
