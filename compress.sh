#!/bin/bash
SRC_FILES="nanomaps.core.js nanomaps.desktop.js nanomaps.touch.js nanomaps.tiles.js"

cd $(dirname $0)
test -d build/dist || mkdir -p build/dist/lib

for file in $SRC_FILES
do
	java -jar tools/yuicompressor-2.4.2.jar -o build/dist/lib/$file client/lib/$file
	gzip -c build/dist/lib/$file > build/dist/lib/$file.gz
done

cp -R client/*.html client/images build/dist
cp -R client/test build/dist

ls -l build/dist/lib

if [ -d pages ]; then
	echo "Updating demo in pages"
	cp -R build/dist pages/demo
fi

