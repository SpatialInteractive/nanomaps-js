#!/bin/bash
SRC_FILES="nanomaps.core.js nanomaps.desktop.js"

cd $(dirname $0)
test -d build || mkdir build

for file in $SRC_FILES
do
	java -jar tools/yuicompressor-2.4.2.jar -o build/$file client/lib/$file
	gzip -c build/$file > build/$file.gz
done
ls -l build

