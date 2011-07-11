#!/bin/bash
cd $(dirname $0)/..
td=$(pwd)
pd=$td/pages

if [ -d $pd ]; then
	echo "Pages dir $pd already exists"
	exit 1
fi

origin=$(git remote -v | grep origin | grep fetch | awk '{print $2;}')
echo "Git origin: $origin"

git clone -n $origin $pd
cd $pd
git checkout -b gh-pages origin/gh-pages



