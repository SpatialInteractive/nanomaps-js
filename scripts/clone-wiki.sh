#!/bin/bash
cd $(dirname $0)/..
td=$(pwd)
wd=$td/wiki

if [ -d $wd ]; then
	echo "Wiki dir $wd already exists"
	exit 1
fi

origin=$(git remote -v | grep origin | grep fetch | awk '{print $2;}')
echo "Git origin: $origin"

wiki_origin=${origin%%.git}.wiki.git
echo "Wiki origin: $wiki_origin"

git clone $wiki_origin $wd


