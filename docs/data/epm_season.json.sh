#!/usr/bin/env bash
JS=/tmp/epmSeason.js
printf "const data = " > $JS
# grab the javascript-formatted object from the source
curl -s https://dunksandthrees.com/epm | sed -n 's/.*data: \(\[.*\]\).*/\1/p' >> $JS
printf "\nconsole.log(JSON.stringify(data));" >> $JS
node $JS
