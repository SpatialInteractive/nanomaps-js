#!/bin/bash
cd $(dirname $0)
td=$(pwd)
out=$td/build/apidocs

SRC_FILES="client/lib/nanomaps.core.js client/lib/nanomaps.tiles.js 
			client/lib/nanomaps.desktop.js client/lib/nanomaps.touch.js"

if [ -z "$JSDOC_DIR" ]; then
	JSDOC_DIR=$td/jsdoc-toolkit
fi

if ! [ -f "$JSDOC_DIR/jsrun.jar" ]; then
	echo "JSDoc Toolkit not found in $JSDOC_DIR.  Please install it."
	echo "It can be downloaded from: http://code.google.com/p/jsdoc-toolkit/"
	exit 1
fi

jsdoc() {
	if ! ( java -Djsdoc.dir=$JSDOC_DIR -jar $JSDOC_DIR/jsrun.jar $JSDOC_DIR/app/run.js "$@" ); then
		return 1
	fi
}

mkdir -p $out

if ! ( jsdoc -d=$out -e=UTF-8 -t=$JSDOC_DIR/templates/jsdoc $SRC_FILES )
then
	echo "Error generating documentation."
	exit 1
fi

if [ -d $td/pages ]; then
	echo "Updating website with documentation"
	mkdir -p $td/pages/apidocs
	cp -a $out/* $td/pages/apidocs	
fi

