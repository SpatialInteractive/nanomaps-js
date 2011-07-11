##EJSON
##=
var metaversion=read('/meta/version.js');
if (metaversion) {
	eval(metaversion);
} else {
	NANOMAPS_VERSION={
		revision: 'unknown',
		branch: 'unknown',
		origin: 'unknown',
		time: 'unknown',
		builder: 'unknown'
	};
}
##=
/*!
 * Nanomaps JavaScript Library
 * https://github.com/SpatialInteractive/nanomaps-js
 * Copyright 2011, Stella Laurenzo
 * Licensed under the MIT open source license
 * Version #{NANOMAPS_VERSION.version}
 * Built by: #{NANOMAPS_VERSION.builder} at #{NANOMAPS_VERSION.time}
 * Origin: #{NANOMAPS_VERSION.origin} 
 * Branch: #{NANOMAPS_VERSION.branch}
 * Revision: #{NANOMAPS_VERSION.revision}
 */
(function(global) {
var exports={};
global.nanomaps=exports;
##include('lib/components/nanomaps.util.js')
##include('lib/components/nanomaps.dom.js')
##include('lib/components/nanomaps.geometry.js')
##include('lib/components/nanomaps.projections.js')
##include('lib/components/nanomaps.animation.js')
##include('lib/components/nanomaps.core.js')
##include('lib/components/nanomaps.tiles.js')
##include('lib/components/nanomaps.motion.js')
##include('lib/components/nanomaps.imgmarker.js')
##include('lib/components/nanomaps.svgmarker.js')
##include('lib/components/nanomaps.infowindow.js')
})(window);

