#!/usr/bin/env bash
curl -s https://dunksandthrees.com/epm | grep 'const data' > /tmp/epm.js
printf "\nconsole.log(JSON.stringify(data));" >> /tmp/epm.js
node /tmp/epm.js
