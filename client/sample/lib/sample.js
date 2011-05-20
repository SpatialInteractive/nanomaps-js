##EJSON
##include('debugpane.js')

(function(global) {
/** Imports **/
var nanomaps=global.nanomaps;

/** Locals **/
var map, 
	tileLayer, 
	mapShowing,
	geoLocationWatchId,
	locationMarker=new nanomaps.ImgMarker({
			src: 'orb_blue.png'
		}),
	placeTemplate=new nanomaps.ImgMarker({
			src: 'pin_pink.png'
		}),
	placeElt,
	locationElt,
	locationUncertaintyMarker=new nanomaps.EllipseMarker({
			className: 'errorHalo',
			unit: 'm'
		}),
	locationUncertaintyElt;

/** Global scope **/
function initialize() {
	var mapElt=$('#map').get(0);
	map=new nanomaps.MapSurface(mapElt, {});
	map.on('motion.longtap', function(motionEvent) {
		var latLng=map.getLocation(motionEvent.x, motionEvent.y);
		showDebugMessage('Long tap: ' + latLng.lat() + ',' + latLng.lng());
		motionEvent.handled=true;
	});
	
	//showDebugMessage('Loading map');
	tileLayer=new nanomaps.TileLayer({
		tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png"
	});
	
	/** Global exports **/
	global.map=map;
	
	/** Don't attach tile layer yet - we do that after we acquire an initial location **/
	try {
		navigator.geolocation.getCurrentPosition(
			handleGeoLocation,
			handleGeoLocationError,
			{maximumAge:Infinity, timeout: 2000}
		);
		//throw "No geoloc";
		// Set fallback timeout to get the map showing on timeout
		setTimeout(function() {
			showMap();
		}, 2500);
	} catch (e) {
		showMap();
	}
	
	setupControls();
	setupQuery();
}

function setupControls() {
	$('#zoomControl .zoomIn').click(function() {
		map.begin();
		map.zoomIn();
		map.commit(true);
	});
	$('#zoomControl .zoomOut').click(function() {
		map.begin();
		map.zoomOut();
		map.commit(true);
	});
}

function setupQuery() {
	$('#btnQuery').click(function() {
		var q=$('#txtQuery').val();
		runQuery(q);
	});
}

function runQuery(q) {
	var params={
		format: 'json',
		q: q,
		bounded: 0,
		}, 
		url='http://open.mapquestapi.com/nominatim/v1/search',
		k, v, first=true;
	
	$.ajax({
		url: url,
		dataType: 'json',
		jsonp: 'json_callback',
		data: params,
		success: function(result) {
			if (result.length==0) {
				alert('No results found.');
				return;
			}
			var place=result[0],
				lat=Number(place.lat),
				lng=Number(place.lon);
			if (placeElt) {
				$(placeElt).remove();
			}
			
			// Place marker
			placeElt=map.attach(placeTemplate);
			placeElt.geo.latitude=lat;
			placeElt.geo.longitude=lng;
			map.update(placeElt);
			
			// Move map
			map.begin();
			map.setLocation({lat: lat, lng: lng});
			map.setZoom(10);
			map.commit({
				duration: 2.0
			});
		}
	});
}

/**
 * Called on browser window resize.  Just have the map reset its
 * natural size
 */
function resize() {
	map.setSize();
}

/**
 * Show an initial location on the map if the map is not already
 * showing.
 */
function showMap(initialPosition, initialLevel) {
	if (mapShowing) return;
	if (!initialPosition) initialPosition={
		// Seattle - my favorite city
		lat: 47.604317, 
		lng: -122.329773
	};
	if (initialLevel) map.setZoom(initialLevel);
	map.setLocation(initialPosition);
	
	// Show tiles
	map.attach(tileLayer);
	mapShowing=true;
}

function handleGeoLocation(position) {
	var latLng={lat: position.coords.latitude, lng: position.coords.longitude };
	showMap(latLng, 13);

	// Make sure halo is below the marker
	locationUncertaintyMarker.settings.latitude=latLng.lat;
	locationUncertaintyMarker.settings.longitude=latLng.lng;
	locationUncertaintyMarker.settings.radius=position.coords.accuracy;
	if (locationUncertaintyElt) {
		map.update(locationUncertaintyElt);
	} else {
		locationUncertaintyElt=map.attach(locationUncertaintyMarker);
	}
	
	
	if (!locationElt) {
		locationElt=map.attach(locationMarker);
	}

	locationElt.geo.latitude=latLng.lat;
	locationElt.geo.longitude=latLng.lng;
	map.update(locationElt);
	
	if (!geoLocationWatchId) {
		geoLocationWatchId=navigator.geolocation.watchPosition(handleGeoLocation, handleGeoLocationError);
	}
}

function handleGeoLocationError(error) {
	console.log('Could not get location: ' + error.message);
	showMap();
}


$(window).load(initialize);
//$(window).resize(resize);
})(window);

