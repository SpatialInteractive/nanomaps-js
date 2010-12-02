#!/bin/bash
cd $(dirname $0)
test -d build || mkdir build
java -jar tools/yuicompressor-2.4.2.jar -o build/nanocore.js client/lib/nanocore.js
gzip -c build/nanocore.js > build/nanocore.js.gz
ls -l build

