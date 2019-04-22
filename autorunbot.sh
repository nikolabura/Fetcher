#!/bin/bash

COUNTER=1

RESTARTSECS=60

CURDATE=$(date -I)
LOGFILE="logs/log-$CURDATE.txt"
echo "Current date is: $CURDATE"
echo "Logging to: $LOGFILE"

while true; do
	echo "Starting fetcher bot. Restart counter: $COUNTER" | tee -a $LOGFILE
	echo "Time of start is $(date)" | tee -a $LOGFILE
	node bot.js | tee -a $LOGFILE
	echo "Bot has exited. Restarting in $RESTARTSECS seconds..." | tee -a $LOGFILE
	sleep $RESTARTSECS
	echo "Timeout period complete." | tee -a $LOGFILE
done
