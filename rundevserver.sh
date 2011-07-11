#!/bin/bash
cd $(dirname $0)

exec java -jar bin/assetserver serve --http=5085 --disable-optimization --clear-cache .

echo "Failed to start assetserver.  Please get a copy from http://www.rcode.net/assetserver/"
exit 1

