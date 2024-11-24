#!/usr/bin/env
set -x
curl -s https://dunksandthrees.com/stats/player | grep 'const data' > /tmp/epmSeason.js
printf "\nconsole.log(JSON.stringify(data));" >> /tmp/epmSeason.js
node /tmp/epmSeason.js
