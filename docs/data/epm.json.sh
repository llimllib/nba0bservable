#!/usr/bin/env
node -e "$(curl https://dunksandthrees.com/epm | grep 'const data') console.log(JSON.stringify(data))"
