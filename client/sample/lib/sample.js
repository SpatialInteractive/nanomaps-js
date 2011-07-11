##EJSON
##include('debugpane.js')

(function(global) {
/** Imports **/
var nanomaps=global.nanomaps;

/** Locals **/
var map,
	tapIw,
	mapShowing,
	geoLocationWatchId,
	locationMarker=new nanomaps.ImgMarker({
			src: 'orb_blue.png'
		}),
	placeMarker=new nanomaps.ImgMarker({
			src: 'pin_pink.png'
		}),
	locationUncertaintyMarker=new nanomaps.EllipseMarker({
			className: 'errorHalo',
			unit: 'm'
		});

var TILE_LAYERS={
	street: new nanomaps.TileLayer({
			tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png"
			//tileSrc: "http://192.168.0.102:7666/map/mqstreet/${level}/${tileX}/${tileY}?pixelRatio=${pixelRatio}",
			//autoPixelRatio: true
		}),
	sat: new nanomaps.TileLayer({
			tileSrc: "http://oatile${modulo:1,2,3}.mqcdn.com/naip/${level}/${tileX}/${tileY}.jpg"
		}),
	hyb: new nanomaps.TileLayer({
			tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/hyb/${level}/${tileX}/${tileY}.png"
		})
};
	
function setTileLayer(type) {
	if (type==='street') {
		map.detach(TILE_LAYERS.sat);
		map.detach(TILE_LAYERS.hyb);
		map.attach(TILE_LAYERS.street);
	} else if (type==='aerial') {
		map.detach(TILE_LAYERS.street);
		map.attach(TILE_LAYERS.sat);
		map.attach(TILE_LAYERS.hyb);
	}
}
	
/** Global scope **/
function initialize() {
	var mapElt=$('#map').get(0);
	
	// Detect hi resolution display and bias zoom levels
	var pixelRatio=window.devicePixelRatio||1;
	
	map=new nanomaps.MapSurface(mapElt, {
		//zoomBias: zoomBias
	});
	map.on('motion.longtap', function(motionEvent) {
		var latLng=map.getLocation(motionEvent.x, motionEvent.y);
		showDebugMessage('Long tap: ' + latLng.lat() + ',' + latLng.lng());
		motionEvent.handled=true;
	});
	map.on('motion.click', function(motionEvent) {
		if (motionEvent.count===1) {
			var latLng=map.getLocation(motionEvent.x, motionEvent.y);
			//showDebugMessage('Single tap: ' + latLng.lat() + ',' + latLng.lng() + ', Zoom=' + map.getZoom());
			motionEvent.handled=true;

			if (tapIw) map.detach(tapIw);
			tapIw=new nanomaps.InfoWindow();
			$(tapIw.getContent()).text('Location: (' + latLng.lat() + ', ' + latLng.lng() + ')');
			$(tapIw.element).click(function() {
				if (tapIw) map.detach(tapIw);
			});
			tapIw.setLocation(latLng);
			map.attach(tapIw);
		}
	});
	
	//showDebugMessage('Loading map');
	/** Global exports **/
	//global.map=map;
	
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
	
	$('#btnStreet').click(function() {
		setTileLayer('street');
	});
	$('#btnAerial').click(function() {
		setTileLayer('aerial');
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
			
			// Place marker
			placeMarker.setLocation({lat:lat,lng:lng});
			map.attach(placeMarker);
			
			// Move map
			map.begin();
			map.setLocation({lat: lat, lng: lng});
			map.setZoom(10);
			map.commit({
				//duration: 2.0
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
	setTileLayer('street');
	
	
	// Show tiles
	mapShowing=true;
}

function handleGeoLocation(position) {
	var latLng={lat: position.coords.latitude, lng: position.coords.longitude };
	showMap(latLng, 13);

	// Make sure halo is below the marker
	locationUncertaintyMarker.settings.latitude=latLng.lat;
	locationUncertaintyMarker.settings.longitude=latLng.lng;
	locationUncertaintyMarker.settings.radius=position.coords.accuracy;
	map.update(locationUncertaintyMarker);
	
	locationMarker.setLocation(latLng);
	map.update(locationMarker);
	
	$(locationMarker.element).click(function() {
		if (tapIw) map.detach(tapIw);
		tapIw=new nanomaps.InfoWindow();
		$(tapIw.getContent()).text('My Location');
		tapIw.setLocation(latLng, {
			x: 0,
			y: locationMarker.element.clientHeight/2
		});
		$(tapIw.element).click(function() {
			if (tapIw) map.detach(tapIw);
		});
		map.attach(tapIw);
	});
	
	if (!geoLocationWatchId) {
		geoLocationWatchId=navigator.geolocation.watchPosition(handleGeoLocation, handleGeoLocationError);
	}
}

function handleGeoLocationError(error) {
	console.log('Could not get location: ' + error.message);
	showMap();
}


$(window).load(initialize);
$(window).resize(resize);
})(window);

