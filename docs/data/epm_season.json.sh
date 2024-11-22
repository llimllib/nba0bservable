#!/usr/bin/env
node -e "$(curl https://dunksandthrees.com/stats/player | grep 'const data') console.log(JSON.stringify(data))"
