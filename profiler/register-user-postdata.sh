#!/bin/bash
INVALID=0
TESTUSER=0
# As long as there is at least one more argument, keep looping
while [[ $# -gt 0 ]]; do
    key="$1"
    case "$key" in
        # Also a flag type option. Will catch either -b or --bar
        -i|--invalid)
        INVALID=1
        ;;
        -t|--testuser)
        TESTUSER=1
        ;;
    esac
    # Shift after checking all the cases to get the next option
    shift
done

if [ $INVALID -eq 1 ]
	then
	#Invalid input, pass too short
	echo '{"username":"testinvalid","password":"short","email":"somethingdifferenttest@gmail.com","firstname":"Invalid","lastname":"U"}'
elif [ $TESTUSER -eq 1 ]
	then
	echo '{"username":"testuser","password":"password","email":"somethingdifferenttest@gmail.com","firstname":"Test","lastname":"U"}'
else
	RANDSTRING=`bash ./rand-string.sh`
	echo '{"username":"'$RANDSTRING'","password":"1234567","email":"somethingdifferenttest@gmail.com","firstname":"Rand","lastname":"U"}'
fi