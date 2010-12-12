/**
nanomaps.core.js
Core map display library.
*/


var nanomaps=(function(exports) {
var __nextId=0;

/**
 * EventEmitter base class.  Based on Node.js EventEmitter.
 */
function EventEmitter() {
}
var EventEmitterMethods=EventEmitter.prototype={};

/**
 * If called without a name, returns the object of event lists.
 * If called with a name, returns the event list for the given
 * name.  Always allocates objects as necessary.
 */
EventEmitterMethods._evt=EventEmitterMethods.listeners=function(name) {
	var hash=this.__evt, list;
	if (!hash) {
		this.__evt=hash={};
	}
	list=hash[name];
	if (!list) list=hash[name]=[];
	return list;
};
EventEmitterMethods.addListener=EventEmitterMethods.on=function(event, listener) {
	this._evt(event).push(listener);
};
EventEmitterMethods.once=function(event, listener) {
	this._evt(event+'$once').push(listener);
};
EventEmitterMethods.removeListener=function(event, listener) {
	removeFromList(this._evt(event));
	removeFromList(this._evt(event+'$once'));
	
	function removeFromList(list) {
		for (var i=list.length-1; i>=0; i--) {
			if (list[i]===listener)
				list.splice(i, 1);
		}
	}
};
EventEmitterMethods.removeAllListeners=function(event) {
	this._evt(event).length=0;
	this._evt(event+'$once').length=0;
};
EventEmitterMethods.emit=function(event /*, arg1..argn */) {
	var i, list=this._evt(event), eventArgs=Array.prototype.slice.call(arguments, 1),
		handler=this['on_' + event];
	
	// Emit on this object
	if (typeof handler==='function') {
		handler.apply(this, eventArgs);
	}
	
	// Emit once events
	list=this._evt(event+'$once');
	for (i=0; i<list.length; i++) {
		list[i].apply(this, eventArgs);
	}
	list.length=0;	// Zero the once only array

	// Emit standard events
	for (i=0; i<list.length; i++) {
		list[i].apply(this, eventArgs);
	}
};

/**
 * Overrides the given methodName on this instance applying the given
 * advice ("before" or "after").  The given target method is invoked
 * for the advice.
 */
EventEmitterMethods.advise=function(methodName, advice, target) {
	var originalMethod=this[methodName],
		advisorStub, adviceList;
		
	if (!originalMethod || !originalMethod.__stub__ || !this.hasOwnProperty(methodName))
		advisorStub=this[methodName]=getAdvisorStub(originalMethod);
	else
		advisorStub=originalMethod;
	
	adviceList=advisorStub[advice];
	if (adviceList) adviceList.push(target);
};

function getAdvisorStub(method) {
	var stub=function() {
		var i, thisFunction=arguments.callee,
			list, retValue;
		
		// Apply before advice
		list=thisFunction.before;
		for (i=0; i<list.length; i++) {
			list[i].apply(this, arguments);
		}
		
		// Invoke original method
		if (method) retValue=method.apply(this, arguments);
		
		// Invoke after method
		list=thisFunction.after;
		for (i=0; i<list.length; i++) {
			list[i].apply(this, arguments);
		}
	};
	stub.__stub__=true;
	stub.before=[];
	stub.after=[];
	return stub;
}

/**
 * Creates and returns a listener function that can be used with Element.addEventListener
 * and routes the event to the target instance, calling its emit method with
 * the given eventName.
 * The instance event will be emitted with two arguments: event, element
 * This method only supports W3C DOM.  IE is not supported.
 */
function createDomEventDispatcher(target, eventName) {
	return function(event) {
		target.emit(eventName, event||window.event, this);
	};
}

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
		viewportElt, glassElt, managedElt, center, projection;
		
	// Local functions
	function createElement(name) {
		return document.createElement(name);
	}
	this.createElement=createElement;
	
	// Hardcode some important styles
	elt.style.overflow='visible';
	attr=elt.style.position;
	if (attr!='relative' && attr!='absolute' && attr!='fixed')
		elt.style.position='relative';	// Make positioned
	attr=elt.style.zIndex;
	if (attr==='' || attr==='auto')
		elt.style.zIndex='inherit';	// Establish a new stacking context
	
	/* 
	DOM Structure:
	
		<div style="width: xxpx; height: yypx; z-index: inherit; overflow: visible; position: relative;">
			<!-- main map viewport (overflow: hidden) -->
			<div class="viewport" 
				style="overflow: hidden; position: absolute; left: 0px; top: 0px; width: 100%; height: 100%;">
				<div class="managed" style="position: absolute; width: 100%; height: 100%">
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
	function createOverlay() {
		var overlay=createElement('div');
		overlay.style.overflow='hidden';
		overlay.style.position='absolute';
		overlay.style.left='0px';
		overlay.style.top='0px';
		overlay.style.width='100%';
		overlay.style.height='100%';
		return overlay;
	}
	
	// create glass
	glassElt=createOverlay();
	glassElt.className='glass';
	glassElt.style.display='none';
	elt.insertBefore(glassElt, elt.firstChild);
	
	
	// create viewport
	viewportElt=createOverlay();
	viewportElt.className='viewport';
	elt.insertBefore(viewportElt, elt.firstChild);
	
	// create manage
	managedElt=createElement('div');
	managedElt.className='managed';
	managedElt.style.position='absolute';
	managedElt.style.width='100%';
	managedElt.style.height='100%';
	viewportElt.appendChild(managedElt);
	
	// Dictionary of elements
	this.elements={
		document: document,
		managed: managedElt,
		viewport: viewportElt,
		glass: glassElt,
		parent: elt
	};
	
	// Fixed size or autosize
	if (typeof width!=='number' || typeof height!=='number') {
		this.setSize();
		// Auto width/height (get inner size)
		width=elt.clientWidth;
		height=elt.clientHeight;
	} else {
		this.setSize(width, height);
	}
	
	// Initialize transform
	projection=options.projection||new Projections.WebMercator();
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
	
	// Initialization hook
	this.initialize(options);
}
var MapSurfaceMethods=MapSurface.prototype=new EventEmitter();
/**
 * Iterate over each child element of the global layer, invoking
 * callback.  The this reference is preserved as this instance in
 * calls.
 */
MapSurfaceMethods._each=function(includeManaged, callback) {
	var elements=this.elements, managed=elements.managed, viewport=elements.viewport;
	for (var childElt=viewport.firstChild; childElt; childElt=childElt.nextSibling) {
		if (childElt.nodeType!==1) continue;	// Skip non-elements
		if (childElt===managed) {
			// End of list.  Descend to children if includeManaged.
			if (includeManaged&&childElt.firstChild) {
				childElt=childElt.firstChild;
				continue;
			} else break;
				
		}
		callback.call(this, childElt);
	}
};

/**
 * Iterate over contained global elements and trigger listeners.
 */
MapSurfaceMethods._notifyPosition=function() {
	this._each(false, function(element) {
		var delegate=element.mapDelegate||{},
			handler=delegate.onposition;
		if (typeof handler==='function') {
			handler.call(delegate, this, element);
		}
	});
};

/**
 * Reset all elements
 */
MapSurfaceMethods._notifyReset=function() {
	this._each(true, this._notifyResetSingle);
};

/**
 * Reset a single element
 */
MapSurfaceMethods._notifyResetSingle=function(element) {
	var delegate=element.mapDelegate||DEFAULT_MAP_DELEGATE,
		handler=delegate.onreset;
	if (typeof handler==='function')
		handler.call(delegate, this, element);
	
};

/**
 * Initialization hook.  Performs initialization after map structures have
 * been initialized.
 */
MapSurfaceMethods.initialize=function(options) {
};

/**
 * Translates a mouse event to viewport relative coordinates and returns
 * {x:, y: }
 * TODO: Fix this.  It doesn't work in a number of corner cases.
 */
MapSurfaceMethods.eventToContainer=function(event, elementName) {
	var relativeTo=this.elements[elementName||'viewport'], start=relativeTo,
		coords={x: event.clientX, y: event.clientY};
	
	do {
		coords.x-=start.offsetLeft;
		coords.y-=start.offsetTop;
	} while (start=start.offsetParent);
	
	// Add window.page?Offset
	coords.x+=window.pageXOffset||0;
	coords.y+=window.pageYOffset||0;
	
	return coords;
};

/**
 * Adds a DOM event listener to the given elementName (as found in the 
 * this.elements map) with the given event domEventName and eventName
 * to be raised on this instance.
 * @param domEventName DOM event name to listen
 * @param eventName Name of event to emit on this instance (defaults to "dom_${domEventName})
 * @param elementName Name of element in this.elements collection (defaults to
 * viewport)
 */
MapSurfaceMethods.routeDomEvent=function(domEvent, thisEvent, elementName) {
	var element=this.elements[elementName||'viewport'],
		listener=createDomEventDispatcher(this, thisEvent||('dom_'+domEvent));
	if (element.addEventListener) element.addEventListener(domEvent, listener, false);
	else if (element.attachEvent) element.attachEvent('on' + domEvent, listener);
};

MapSurfaceMethods.attach=function(element) {
	// Detect if HTMLElement in standards compliant way with fallbacks for IE
	var isHTML=window.HTMLElement ? element instanceof HTMLElement : (element.nodeType===1);
	if (!isHTML) {
		// Treat as a delegate
		element=element.createElement(this);
	}
	
	var delegate=element.mapDelegate||DEFAULT_MAP_DELEGATE,
		elements=this.elements;

	element.style.position='absolute';	// Make positioned
	if (delegate.unmanaged) {
		// Add to the viewport before the global element
		elements.viewport.insertBefore(element, elements.managed);
	} else {
		// Add to the managed element
		elements.managed.appendChild(element);
	}
	
	this._notifyResetSingle(element);
};

MapSurfaceMethods.update=function(element) {
	if (!element.parentElement) this.attach(element);
	else this._notifyResetSingle(element);
};

MapSurfaceMethods.setSize=function(width, height) {
	var elt=this.elements.parent, center=this._center;
	if (arguments.length<2) {
		elt.style.left='';
		elt.style.top='';
		width=elt.clientWidth;
		height=elt.clientHeight;
	}
	
	elt.style.width=width+'px';
	elt.style.height=height+'px';
	this.width=width;
	this.height=height;
	
	// center will be undefined at init-time setSize
	if (center) this.setCenter(center);
};

/**
 * Set the map center to {lat:, lng:}
 */
MapSurfaceMethods.setCenter=function(centerLatLng) {
	this._updateCenter(centerLatLng);	
	this._notifyPosition();
};

/**
 * Internal method - update the center but don't notify layers of a
 * position change.
 */
MapSurfaceMethods._updateCenter=function(centerLatLng) {
	// Update the offset of the managed container
	var managed=this.elements.managed, transform=this.transform,
		lat=centerLatLng.lat||0, lng=centerLatLng.lng||0,
		xy;
	this._center={lat:lat,lng:lng};
	xy=transform.toSurface(lng, lat);
	xy[0]-=this.width/2;
	xy[1]-=this.height/2;
	
	managed.style.left=(-xy[0]) + 'px';
	managed.style.top=(-xy[1]) + 'px';
};

MapSurfaceMethods.getCenter=function() {
	return this._center;
};

MapSurfaceMethods.getResolution=function() {
	return this.transform.res;
};

MapSurfaceMethods.setResolution=function(resolution, preserveXY) {
	var center=this._center, deltaX, deltaY, centerLngLat;
	
	//if (preserveXY) console.log('setResolution(' + resolution + ', preserveX=' + preserveXY.x + ', preserveY=' + preserveXY.y + ')');
	if (preserveXY) {
		// re-interpret the center such that the point at the given
		// offset in the viewport stays at the given point
		//console.log('original center: lat=' + center.lat + ', lng=' + center.lng);
		center=this.toLatLng(preserveXY.x, preserveXY.y);
		//console.log('revised center: lat=' + center.lat + ', lng=' + center.lng);
		deltaX=this.width/2-preserveXY.x;
		deltaY=this.height/2-preserveXY.y;
		// deltaX and deltaY = offset from center to recenter at
	}
	
	this.transform=this.transform.rescale(resolution, [center.lng, center.lat]);
	
	if (preserveXY) {
		// Reset the center based on the offset
		// Can't use this.toLatLng here because we are not yet in a consistent
		// state (_updateCenter has not been called) and toLatLng uses this to
		// do viewport relative coordinates.  Take advantage of the fact that
		// we know the zero pixel point to be the lat/lng under the original
		// prserveXY coordinates to avoid the need for viewport biasing.
		//console.log('Biasing center by (' + deltaX + ',' + deltaY + ')px');
		centerLngLat=this.transform.fromSurface(deltaX, deltaY);
		if (centerLngLat) {
			center.lng=centerLngLat[0];
			center.lat=centerLngLat[1];
		}
	}
	
	this._updateCenter(center);
	this._notifyReset();
};

MapSurfaceMethods.setLevel=function(level, offset) {
	var prj=this.transform.prj, minLevel=prj.MIN_LEVEL, maxLevel=prj.MAX_LEVEL;
	
	if (!level) return;
	if (level>maxLevel) level=maxLevel;
	else if (level<minLevel) level=minLevel;
	
	this.setResolution(prj.fromLevel(level), offset);
};


MapSurfaceMethods.getLevel=function() {
	var transform=this.transform;
	return transform.prj.toLevel(transform.res);
};

/**
 * Given x,y coordinates relative to the visible area of the viewport,
 * return the corresponding lat/lng
 */
MapSurfaceMethods.toLatLng=function(x, y) {
	var transform=this.transform, managed=this.elements.managed, lngLat;
	
	//console.log('toLatLng(' + x + ',' + y + ')');
	//console.log('global left=' + global.style.left + ', top=' + global.style.top);
	
	x-=parseInt(managed.style.left);
	y-=parseInt(managed.style.top);
	
	//console.log('zpx rel xy=(' + x + ',' + y + ')');
	
	lngLat=transform.fromSurface(x, y);
	if (!lngLat) return null;
	return {lng: lngLat[0], lat: lngLat[1]};
};

/**
 * Translate a viewport coordinate relative to the visible area to the
 * managed pixel coordinates at the current resolution.
 */
MapSurfaceMethods.toGlobalPixels=function(x, y) {
	var transform=this.transform, managed=this.elements.managed;
	x-=parseInt(managed.style.left);
	y-=parseInt(managed.style.top);
	return {
		x: x + transform.zpx[0],
		y: transform.zpx[1] - y
	};
};

/**
 * Reposition the map by the given number of pixels
 */
MapSurfaceMethods.moveBy=function(eastingPx, northingPx) {
	var latLng=this.toLatLng(this.width/2 + eastingPx, this.height/2 - northingPx);
	//console.log('moveto: lat=' + latLng.lat + ', lng=' + latLng.lng + ' for deltax=' + eastingPx + ', deltay=' + northingPx);
	if (latLng) this.setCenter(latLng);
};


/**
 * Defult delegate for positioned objects that don't supply their own.
 */
var DEFAULT_MAP_DELEGATE={
	onreset: function(map, element) {
		var geo=element.geo, latLng, offset, xy;
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
					element.style.left=(xy[0])+'px';
					element.style.top=(xy[1])+'px';
					element.style.display='block';
					return;
				}
			}
		}
		
		// If here, then geo information was non-conclusive.  Hide the
		// element
		element.style.display='none';
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
	 * Return surface coordinates of the given lat/lng
	 */
	toSurface: function(lng, lat) {
		var xy=this.toPixels(lng, lat);
		if (!xy) return null;
		xy[0]-=this.zpx[0];
		xy[1]=this.zpx[1] - xy[1]; // Note Y axis inversion
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
	 * Convert from surface coordinates to [lng, lat]
	 */
	fromSurface: function(x, y) {
		return this.fromPixels(x+this.zpx[0], this.zpx[1] - y);	// Note Y axis inversion
	}
};


var Projections={
	/**
	 * Standard "Web Mercator" projection as used by Google, Microsoft, OSM, et al.
	 * Instantiate as new WebMercator(options).  Options can include:
	 *   - MIN_LEVEL: Minimum zoom level.  Default==1.
	 *   - MAX_LEVEL: Maximum zoom level.  Default==18.
	 */
	WebMercator: function(options) {
		if (!options) options={};
		this.DEFAULT_CENTER={lat:39.7406, lng:-104.985441};
		this.DEFAULT_RESOLUTION=611.4962;
	
		var EARTH_RADIUS=6378137.0,
			DEG_TO_RAD=.0174532925199432958,
			RAD_TO_DEG=57.29577951308232,
			FOURTHPI=0.78539816339744833,
			HALFPI=1.5707963267948966,
			HIGHEST_RES=78271.5170;
		
		this.MIN_LEVEL=options.MIN_LEVEL||1;
		this.MAX_LEVEL=options.MAX_LEVEL||18;
		
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
		
		/**
		 * Return the resolution (m/px) for the given zoom index given a standard
		 * power of two zoom breakdown.
		 */
		this.fromLevel=function(level) {
			return HIGHEST_RES/Math.pow(2, level-1);
		}
		
		this.toLevel=function(resolution) {
			return Math.log(HIGHEST_RES/resolution) / Math.log(2) + 1;
		}
		
		// release memory from closure
		options=null;
	}
};



// -- Tile Layer
function makeVisibleOnLoad() {
	this.style.visibility='';
}

function TileCache() {
	var contents={},
		marked=[];
	
	function disposeTileDesc(tileDesc) {
		if (tileDesc.img&&tileDesc.img.parentNode) 
			// Detach
			tileDesc.img.parentNode.removeChild(tileDesc.img);
	}
		
	this.mark=function() {
		marked.length=0;
	};
	
	this.free=function() {
		var newContents={},
			key, i, tileDesc;
			
		// Add all marked to the new dictionary
		for (i=0; i<marked.length; i++) {
			tileDesc=marked[i];
			key=tileDesc.key;
			newContents[key]=tileDesc;
			delete contents[key];
		}
		
		// Any existing in contents are to be discarded
		for (i in contents) {
			tileDesc=contents[i];
			disposeTileDesc(tileDesc);
		}
		
		// Swap
		contents=newContents;
		marked.length=0;
	};
	
	this.use=function(tileDesc) {
		var key=tileDesc.key,
			existing=contents[key];
		if (existing) {
			disposeTileDesc(tileDesc);
			tileDesc=existing;
		}
		contents[key]=tileDesc;
		if (marked) marked.push(tileDesc);
		return tileDesc;
	};
	
	this.take=function(tileDesc) {
		var key=tileDesc.key,
			existing=contents[key];
		if (existing) {
			delete contents[key];
			return existing;
		}
		return tileDesc;
	};
	
	this.each=function(callback) {
		var i, tileDesc;
		for (i in contents) {
			tileDesc=contents[i];
			if (tileDesc && typeof tileDesc==='object')
				callback(tileDesc);
		}
	};
	
	this.clear=function() {
		contents={};
		marked.length=0;
	};
	
	this.moveFrom=function(otherCache) {
		otherCache.each(function(tileDesc) {
			var key=tileDesc.key;
			if (contents[key]) {
				// Already exists.  Delete
				disposeTileDesc(tileDesc);
			} else
				contents[tileDesc.key]=tileDesc;
		});
		otherCache.clear();
	};
}

function createStdTileLayer(options) {
	if (!options) options={};
	var element=document.createElement('div');
	element.style.position='absolute';
	element.style.left='0px';
	element.style.top='0px';
	element.mapDelegate=new StdTileLayerDelegate(options);
	return element;
}
function StdTileLayerDelegate(options) {
	this.options=options;
	this.sel=new StdTileSelector(options);
	this.fgCache=new TileCache();
	this.bgCache=new TileCache();
}
StdTileLayerDelegate.prototype={
	placeTile: function(map, element, tileDesc, moveToFront) {
		var img=tileDesc.img,
			transform=map.transform,
			zpx=transform.zpx,
			scaleFactor=tileDesc.res / transform.res;
			
		if (img&&img._error) {
			// Zero it out
			if (img.parentElement) img.parentElement.removeChild(img);
			tileDesc.img=null;
			img=null;
		}
		
		// If no valid img, instantiate it
		if (!img) {
			img=map.createElement('img');
			img.style.visibility='hidden';
			img.onload=makeVisibleOnLoad;
			img.style.position='absolute';
			img.src=this.sel.resolveSrc(tileDesc);
			tileDesc.img=img;
		}
		
		// Set position and size
		img.width=Math.ceil(tileDesc.size*scaleFactor);
		img.height=Math.ceil(tileDesc.size*scaleFactor);
		img.style.left=Math.round(tileDesc.x*scaleFactor - zpx[0]) + 'px';
		img.style.top=Math.round(zpx[1] - tileDesc.y*scaleFactor) + 'px';	// y-axis inversion
		if (moveToFront || img.parentNode!==element) element.appendChild(img);
	},
	
	onreset: function(map, element) {
		var self=this,
			transform=map.transform,
			buffer=self.options.buffer||64,
			ulXY=map.toGlobalPixels(-buffer,-buffer),
			width=map.width+buffer,
			height=map.height+buffer,
			curResolution=self.curResolution,
			displayResolution=transform.res,
			tileList=self.sel.select(transform.prj, displayResolution, ulXY.x, ulXY.y, width, height, true),
			fgCache=self.fgCache,
			bgCache=self.bgCache,
			refreshBackground=false,
			i,
			tileDesc;
			
		if (curResolution&&curResolution!==displayResolution) {
			// We have a scale change.  Snapshot the current tile
			// cache as the background cache and start on a new one
			bgCache.mark();
			bgCache.free();
			bgCache.moveFrom(fgCache);
			refreshBackground=true;
		}

		fgCache.mark();
		for (i=0; i<tileList.length; i++) {
			tileDesc=fgCache.use(bgCache.take(tileList[i]));
			self.placeTile(map, element, tileDesc, true);
		}
		fgCache.free();

		// Record so that the next time through we can tell whether
		// this is a simple change
		this.curResolution=displayResolution;
		
		if (refreshBackground) {
			bgCache.each(function(tileDesc) {
				self.placeTile(map, element, tileDesc);
			});
		}
		
	},
	
	onposition: function(map, element) {
		this.onreset(map, element);
	}
};


// Exports
exports.EventEmitter=EventEmitter;
exports.MapSurface=MapSurface;
exports.Projections=Projections;
exports.MapTransform=MapTransform;
exports.createStdTileLayer=createStdTileLayer;

// module suffix
return exports;
})({});

