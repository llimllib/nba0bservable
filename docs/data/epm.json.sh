#!/usr/bin/env bash
printf "const data = " > /tmp/epm.js
# grab the javascript-formatted object from the source
curl -s https://dunksandthrees.com/epm | sed -n 's/.*data: \(\[.*\]\).*/\1/p' >> /tmp/epm.js
# and use node to turn it into JSON
printf "\nconsole.log(JSON.stringify(data));" >> /tmp/epm.js
node /tmp/epm.js
