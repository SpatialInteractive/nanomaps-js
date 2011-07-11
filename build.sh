#!/bin/bash
version="$1"
if [ -z "$version" ]; then
	version=dev
fi

cd $(dirname $0)
td=$(pwd)
pages=$td/pages
build_name=nanomaps-js-$version
build=build/$build_name
if [ -d $build ]; then
	rm -Rf $build
fi

mkdir -p $build/debug
mkdir -p $build/prod
mkdir -p $build/meta

echo "
NANOMAPS_VERSION={
	version: '$version',
	revision: '$(git rev-parse HEAD)',
	branch: '$(git branch | egrep '^\*' | awk '{print $2}')',
	origin: '$(git remote -v | egrep '^origin' | egrep '\(fetch\)$' | awk '{print $2}')',
	time: '$(date)',
	builder: '$(whoami)@$(hostname)'
};
" > $build/meta/version.js

assetserver="java -jar bin/assetserver"
echo "
mount('/', 'client');
mount('/meta', '$build/meta');
" > build.asconfig

echo "Building debug version into $build/debug"
$assetserver cp --disable-optimization build.asconfig $build/debug

echo "Building prod version into $build/prod"
$assetserver cp build.asconfig $build/prod

echo "Building apidocs"
./generate-docs.sh $build/apidocs

cd build
tar czf $build_name.tar.gz $(basename $build)
cd $td

echo "Copying to pages"
if ! [ -d pages ]; then
	./scripts/clone-pages.sh
fi
mkdir -p $pages/releases
if [ -d $pages/releases/$build_name ]; then
	rm -Rf $pages/releases/$build_name
fi
cp -a $build $pages/releases
cp build/$build_name.tar.gz $pages/releases

echo "Copied release to pages"

