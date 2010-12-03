/**
nanocore.js
Core map display library.
*/


var nanocore=(function(exports) {

var __nextId=0,
	DPI_TO_DPM=100/2.54;
	

/**
 * Instantiate a MapSurface, attaching it to the given element.
 * Options can contain the following attributes:
 *		- width/height: If specified, then the size of the owning element is
 * 			set accordingly.  Otherwise, get the width/height from the element's
 *			bounds.
 *		- center: If specified should be an object containing lat/lng fields
 *			representing the initial center (defaults to 0,0)
 *		- locked: If true, then the lock count is initialized to 1, requiring a
 * 			call to unlock() in order to update visuals
 */
function MapSurface(elt, options) {
	if (!options) options={};
	var document=options.document||elt.ownerDocument||window.document,
		width=options.width, height=options.height, attr,
		viewportElt, globalElt, center, projection;
		
	this._elt=elt;
	this._document=document;
	
	// Local functions
	function createElement(name) {
		return document.createElement(name);
	}
	this.createElement=createElement;
	
	// Fixed size or autosize
	if (typeof width!=='number' || typeof height!=='number') {
		// Auto width/height (get inner size)
		width=elt.clientWidth;
		height=elt.clientHeight;
	}
	
	// Hardcode size and z-index
	elt.style.width=width+'px';
	elt.style.height=height+'px';
	elt.style.overflow='visible';
	attr=elt.style.position;
	if (attr!='relative' && attr!='absolute' && attr!='fixed')
		elt.style.position='relative';	// Make positioned
	attr=elt.style.zIndex;
	if (attr==='' || attr==='auto')
		elt.style.zIndex='inherit';	// Establish a new stacking context
	
	this.width=width;
	this.height=height;
	
	/* 
	DOM Structure:
	
		<div style="width: xxpx; height: yypx; z-index: inherit; overflow: visible; position: relative;">
			<!-- main map viewport (overflow: hidden) -->
			<div class="viewport" 
				style="overflow: hidden; position: absolute; left: 0px; top: 0px; width: 100%; height: 100%;">
				<div class="global" style="position: absolute; width: 100%; height: 100%">
					<!-- globally positioned elements go here -->
				</div>
				<div class="vpul" style="position: absolute; left: 0px; top: 0px; width: 0px; height: 0px;"></div>
				<div class="vpur" style="position: absolute; left: 100%; top: 0px; width: 0px; height: 0px;"></div>
				<div class="vpll" style="position: absolute; left: 0px; top: 100%; width: 0px; height: 0px;"></div>
				<div class="vplr" style="position: absolute; left: 100%; top: 100%; width: 0px; height: 0px;"></div>
			</div>
			
			<!-- unconstrained corners -->
			<div class="scul" style="position: absolute; left: 0px; top: 0px; width: 0px; height: 0px;"></div>
			<div class="scur" style="position: absolute; left: 100%; top: 0px; width: 0px; height: 0px;"></div>
			<div class="scll" style="position: absolute; left: 0px; top: 100%; width: 0px; height: 0px;"></div>
			<div class="sclr" style="position: absolute; left: 100%; top: 100%; width: 0px; height: 0px;"></div>
		</div>
	
	*/
	// create viewport
	viewportElt=createElement('div');
	viewportElt.className='viewport';
	viewportElt.style.overflow='hidden';
	viewportElt.style.position='absolute';
	viewportElt.style.left='0px';
	viewportElt.style.top='0px';
	viewportElt.style.width='100%';
	viewportElt.style.height='100%';
	elt.appendChild(viewportElt);
	this._viewport=viewportElt;
	
	// create global
	globalElt=createElement('div');
	globalElt.className='global';
	globalElt.style.position='absolute';
	globalElt.style.width='100%';
	globalElt.style.height='100%';
	viewportElt.appendChild(globalElt);
	this._global=globalElt;
	
	// TODO: Create corner references
	
	// Initialize transform
	projection=options.projection||Projections.WebMercator;
	center=options.center||projection.DEFAULT_CENTER;
	this.transform=new MapTransform();
	this.transform.init(
		projection,
		options.resolution||projection.DEFAULT_RESOLUTION,
		[center.lng, center.lat]
		);
	
	// Initialize display locking
	this._lock=(options.locked ? 1 : 0);
	
	// Setup initial state by setting center
	this.setCenter(center);
}
MapSurface.prototype={
	/**
	 * Iterate over each child element of the global layer, invoking
	 * callback.  The this reference is preserved as this instance in
	 * calls.
	 */
	_eachGlobal: function(callback) {
		var childElt=this._global.firstChild;
		for (var childElt=this._global.firstChild; childElt; childElt=childElt.nextSibling) {
			if (childElt.nodeType!==1) continue;	// Skip non-elements
			callback.call(this, childElt);
		}
	},
	
	/**
	 * Iterate over contained global elements and trigger listeners.
	 */
	_notifyPosition: function() {
		this._eachGlobal(function(element) {
			var delegate=element.mapDelegate||DEFAULT_MAP_DELEGATE,
				handler=delegate.onposition;
			if (typeof handler==='function') {
				handler.call(element, this, delegate);
			}
		});
	},
	
	/**
	 * Reset all elements
	 */
	_notifyReset: function() {
		this._eachGlobal(this._notifyResetSingle);
	},
	
	/**
	 * Reset a single element
	 */
	_notifyResetSingle: function(element) {
		var delegate=element.mapDelegate||DEFAULT_MAP_DELEGATE,
			handler=delegate.onreset;
		if (typeof handler==='function')
			handler.call(element, this, delegate);
		
	},
	
	attach: function(element) {
		element.style.position='absolute';	// Make positioned
		this._global.appendChild(element);
		this._notifyResetSingle(element);
	},
	
	update: function(element) {
		if (!element.parentElement) this.attach(element);
		else this._notifyResetSingle(element);
	},
	
	/**
	 * Set the map center to {lat:, lng:}
	 */
	setCenter: function(centerLatLng) {
		// Update the offset of the global container
		var global=this._global, transform=this.transform,
			lat=centerLatLng.lat||0, lng=centerLatLng.lng||0,
			xy;
		this._center={lat:lat,lng:lng};
		xy=transform.toPixels(lng, lat);
		xy[0]-=transform.zpx[0] + this.width/2;
		xy[1]-=transform.zpx[1] + this.height/2;
		
		global.style.left=(-xy[0]) + 'px';
		global.style.top=(-xy[1]) + 'px';
		
		this._notifyPosition();
	},
	
	getCenter: function() {
		return this._center;
	},
	
	getResolution: function() {
		return this.transform.res;
	},
	
	setResolution: function(resolution) {
		var center=this._center;
		this.transform=this.transform.rescale(resolution, [center.lng, center.lat]);
		this._notifyReset();
	},
	
	setLevel: function(zoomLevel) {
		this.setResolution(levelResolution(zoomLevel));
	},
	
	getLevel: function() {
		return resolutionLevel(this.transform.res);
	},
	
	/**
	 * Given x,y coordinates relative to the visible area of the viewport,
	 * return the corresponding lat/lng
	 */
	toLatLng: function(x, y) {
		var transform=this.transform, global=this._global, lngLat;
		x-=parseInt(global.style.left);
		y-=parseInt(global.style.top);
		lngLat=transform.fromSurface(x, y);
		if (!lngLat) return null;
		return {lng: lngLat[0], lat: lngLat[1]};
	},
	
	/**
	 * Reposition the map by the given number of pixels
	 */
	moveBy: function(deltax, deltay) {
		var latLng=this.toLatLng(this.width/2 + deltax, this.height/2 + deltay);
		if (latLng) this.setCenter(latLng);
	}
};

var DEFAULT_MAP_DELEGATE={
	onreset: function(map) {
		var geo=this.geo, latLng, offset, xy;
		if (geo) {
			latLng=geo.latLng;
			offset=geo.offset;
			if (latLng) {
				// Calculate position
				xy=map.transform.toSurface(latLng.lng, latLng.lat);
				if (xy) {
					if (offset&&offset.x) xy[0]+=offset.x;
					if (offset&&offset.y) xy[1]+=offset.y;
					
					// set position
					this.style.left=(xy[0])+'px';
					this.style.top=(xy[1])+'px';
					this.style.display='block';
					return;
				}
			}
		}
		
		// If here, then geo information was non-conclusive.  Hide the
		// element
		this.style.display='none';
	}
};

/**
 * Construct a new MapTransform with the given parameters:
 *  - projection: The projection object for the surface
 *  - resolution: Ground resolution in m/px
 *  - zeroLat: The latitude corresponding with the top of the viewport
 *  - zeroLng: The longitude corresponding with the left of the viewport
 */
function MapTransform() {
	this.sequence=__nextId++;
}
MapTransform.prototype={
	init: function(projection, resolution, zeroLngLat) {
		// The sequence number is used to detect if objects are
		// aligned properly against the current transform
		this.prj=projection;
		this.res=resolution;
		this.zll=zeroLngLat;
		
		// Calculate corresponding unaligned pixel coordinates associated
		// with zeroLatLng
		this.zpx=this.toPixels(zeroLngLat[0], zeroLngLat[1]);
	},
	
	/**
	 * Return a new MapTransform at a new scale and zeroLatLng
	 */
	rescale: function(resolution, zeroLngLat) {
		var transform=new MapTransform();
		transform.init(this.prj, resolution, zeroLngLat);
		return transform;
	},
	
	/**
	 * Convert the given longitude/latitude to returned [x, y] coordinates.
	 * Returns null if the lng/lat is out of bounds.
	 * NOTE: the order of the parameters is longitude, latitude, corresponding
	 * with x and y.
	 * In order to align to the viewport, the return value should be subtracted
	 * from this.zeroPx (see toViewport).
	 */
	toPixels: function(lng, lat) {
		var xy=this.prj.forward(lng, lat), resolution=this.res;
		if (!xy) return null;
		xy[0]/=resolution;
		xy[1]/=resolution;
		
		return xy;
	},
	
	/**
	 * Return viewport coordinates of the given lat/lng
	 */
	toSurface: function(lng, lat) {
		var xy=this.toPixels(lng, lat);
		if (!xy) return null;
		xy[0]-=this.zpx[0];
		xy[1]-=this.zpx[1];
		return xy;
	},
	
	/**
	 * Convert from global pixel coordinates to lng/lat.
	 */
	fromPixels: function(x, y) {
		var resolution=this.res;
		return this.prj.inverse(x * resolution, y * resolution);
	},
	
	/**
	 * Convert from viewport coordinates to [lng, lat]
	 */
	fromSurface: function(x, y) {
		return this.fromPixels(x+this.zpx[0], y+this.zpx[1]);
	}
};


var Projections={
	/**
	 * Standard "Web Mercator" projection as used by Google, Microsoft, OSM, et al.
	 */
	WebMercator: new function() {
		this.DEFAULT_CENTER={lat:39.7406, lng:-104.985441};
		this.DEFAULT_RESOLUTION=611.4962;
	
		var EARTH_RADIUS=6378137.0,
			DEG_TO_RAD=.0174532925199432958,
			RAD_TO_DEG=57.29577951308232,
			FOURTHPI=0.78539816339744833,
			HALFPI=1.5707963267948966;
		
		this.forward=function(x, y) {
			return [
				x*DEG_TO_RAD * EARTH_RADIUS, 
				Math.log(Math.tan(FOURTHPI + 0.5 * DEG_TO_RAD * y)) * EARTH_RADIUS 
			];
		};
		
		this.inverse=function(x, y) {
			return [
				RAD_TO_DEG * x / EARTH_RADIUS,
				RAD_TO_DEG * (HALFPI - 2. * Math.atan(Math.exp(-y/EARTH_RADIUS)))
			];
		};
	}
};

/**
 * Return the resolution (m/px) for the given zoom index given a standard
 * power of two zoom breakdown.
 */
function levelResolution(level) {
	level=Number(level);
	if (level<1) level=1;

	var rootRes=78271.5170,
		divisor=Math.pow(2, level-1);
		
	return rootRes/divisor;
}

function resolutionLevel(resolution) {
	var rootRes=78271.5170,
		divisor=rootRes/resolution;
		
	return Math.log(divisor) / Math.log(2) + 1;
}

/**
 * Class representing a tile selector for the layout of OSM, MS, Google, et al.
 * Options:
 *
 */
function StdTileSelector(options) {
	// set defaults
	this.tileSize=options.tileSize||256;
	
}

// -- Tile Layer
function createStdTileLayer(options) {
	var _elt=document.createElement('div');
	
	
	return _elt;
}

// Exports
exports.MapSurface=MapSurface;
exports.Projections=Projections;
exports.MapTransform=MapTransform;
exports.createStdTileLayer=createStdTileLayer;

// module suffix
return exports;
})({});
