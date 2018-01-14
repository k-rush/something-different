#!/bin/bash
#produce login form test data
INVALID=0
# As long as there is at least one more argument, keep looping
while [[ $# -gt 0 ]]; do
    key="$1"
    case "$key" in
        # Also a flag type option. Will catch either -b or --bar
        -i|--invalid)
        INVALID=1
        ;;
    esac
    # Shift after checking all the cases to get the next option
    shift
done

if [ $INVALID -eq 1 ]
then
	#Invalid input
	echo '{"username":"testinvalid","password":"short"}'
else
	echo '{"username":"testuser","password":"password"}'
fi