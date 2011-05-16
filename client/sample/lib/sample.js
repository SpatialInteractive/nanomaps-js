(function(global) {
/** Imports **/
var nanomaps=global.nanomaps;

/** Locals **/
var map, tileLayer, mapInited;

/** Global scope **/
function initialize() {
	var mapElt=$('#map').get(0);
	map=new nanomaps.MapSurface(mapElt, {});
	map.setLevel(12);
	resize();
	
	tileLayer=new nanomaps.TileLayer({
		tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png"
	});
	
	/** Don't attach tile layer yet - we do that after we acquire an initial location **/
	map.attach(tileLayer);
	
	/** Global exports **/
	global.map=map;
}

function resize() {
	map.setSize();
}

$(window).load(initialize);
$(window).resize(resize);
})(window);

