#!/bin/bash
SRC_FILES="nanomaps.core.js nanomaps.desktop.js nanomaps.touch.js nanomaps.tiles.js"

cd $(dirname $0)
test -d build || mkdir -p build/lib

for file in $SRC_FILES
do
	java -jar tools/yuicompressor-2.4.2.jar -o build/lib/$file client/lib/$file
	gzip -c build/lib/$file > build/lib/$file.gz
done

cp client/*.html build
cp -R client/test build

ls -l build/lib

