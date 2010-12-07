#!/usr/bin/env node
var connect=require('connect');

function noCacheMiddleware(req, res, next) {
	
	var origWriteHead=res.writeHead;
	function newWriteHead(code, headers) {
		if (!headers) headers={};
		headers['Expires']='Fri, 30 Oct 1998 14:19:41 GMT';
		headers['Cache-Control']='max-age=0, no-cache';
		
		return origWriteHead.call(this, code, headers);
	}
	res.writeHead=newWriteHead;
	
	return next();
}

/* create actual root server */
var port=3500, 
	server=connect.createServer(
		/* serve favicon before logger to avoid chatter */
		connect.favicon(),
		connect.logger(),
		noCacheMiddleware
	);

/* add routes */
server.use('/', connect.staticProvider(__dirname + '/client'));

console.log('Starting server on port ' + port);
server.listen(port);
console.log('Server running.');


