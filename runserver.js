#!/usr/bin/env node
var connect=require('connect');

/* create actual root server */
var port=3500, 
	server=connect.createServer(
		/* serve favicon before logger to avoid chatter */
		connect.favicon(),
		connect.logger()
	);

/* add routes */
server.use('/', connect.staticProvider(__dirname + '/client'));

console.log('Starting server on port ' + port);
server.listen(port);
console.log('Server running.');


