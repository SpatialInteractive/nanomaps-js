/**
nanomaps.core.js
Core map display library.
*/

/**
 * The entire viewable state of the map is represented by the
 * following vital parameters:
 * <ul>
 * <li>prj - Map projection
 * <li>res - resolution (projected units/pixel)
 * <li>x - origin of the upper left corner of the map
 * <li>y - origin of the upper left corner of the map
 * <li>w - width of the map area
 * <li>h - height of the map area
 * </ul>
 * 
 * Representing this as a value object aids when dealing
 * with transitions, animations, etc where we want to interpolate
 * between two or more MapState instances.
 * <p>
 * The MapSurface holds the "master" MapState in its mapState
 * property.  This property can be read but should only be modified
 * through appropriate API calls.
 *
 * @constructor
 * @name nanomaps.MapState
 */
function MapState() {
	this.prj=null;
	this.res=1;
	this.x=0;
	this.y=0;
	this.w=0;
	this.h=0;
}
MapState.prototype={
	/// -- Getters
	getZoom: function() {
		return this.prj.toLevel(this.res);
	},
	
	/**
	 * Return the x-coordinate in display space of the given viewport
	 * coordinates.  Note this function takes (x,y) as it is forward
	 * designed to be able to represent orientation.
	 * <p>
	 * This value will be resolution pre-divided
	 */
	getDspX: function(x,y) {
		return this.x+x;
	},
	/**
	 * Return the y-coordinate in display space of the given viewport
	 * coordinates.  Note this function takes (x,y) as it is forward
	 * designed to be able to represent orientation.
	 * <p>
	 * This value will be resolution pre-divided
	 */
	getDspY: function(x,y) {
		return this.y+y;
	},
	
	/**
	 * Get projected x-coordinate of the given viewport coordinates.
	 * Note that these coordinates will have resolution multiplied out
	 * and will have axis inversion relative to display coordinates
	 * if the proejction defines it.
	 */
	getPrjX: function(x,y) {
		var prj=this.prj,
			displayX=this.getDspX(x,y) * this.res;
		if (prj.XINVERTED) {
			displayX=prj.PRJ_EXTENT.maxx - displayX;
		}
		return displayX;
	},
	
	/**
	 * Get projected y-coordinate of the given viewport coordinates.
	 * Note that these coordinates will have resolution divided out
	 * and will have axis inversion relative to display coordinates
	 * if the proejction defines it.
	 */
	getPrjY: function(x,y) {
		var prj=this.prj,
			displayY=this.getDspY(x,y) * this.res;
		if (prj.YINVERTED) {
			displayY=prj.PRJ_EXTENT.maxy - displayY;
		}
		return displayY;
	},
	
	/**
	 * Return global x coordinate corresponding to viewport coordinate (x,y).
	 */
	getGlbX: function(x,y) {
		return this.prj.invX(this.getPrjX(x,y));
	},
	
	/**
	 * Return global y coordinate corresponding to viewport coordinate (x,y).
	 */
	getGlbY: function(x,y) {
		return this.prj.invY(this.getPrjY(x,y));
	},
	
	/// -- calculations
	prjToDspX: function(prjX) {
		var prj=this.prj;
		if (prj.XINVERTED) {
			prjX=prj.PRJ_EXTENT.maxx - prjX;
		}
		return prjX / this.res;
	},
	
	prjToDspY: function(prjY) {
		var prj=this.prj;
		if (prj.YINVERTED) {
			prjY=prj.PRJ_EXTENT.maxy - prjY;
		}
		return prjY / this.res;
	},
	
	/// -- Setters
	setRes: function(res, x, y) {
		if (res!==this.res) {
			var prjX=this.getPrjX(x,y), prjY=this.getPrjY(x,y);
			this.res=res;
			this.setPrjXY(prjX, prjY, x, y);
		}
	},
	
	setZoom: function(level, x, y) {
		this.setRes(this.prj.fromLevel(level), x, y);
	},
	
	setDspXY: function(dspX, dspY, x, y) {
		this.x=dspX-x;
		this.y=dspY-y;
	},
	
	setPrjXY: function(prjX, prjY, x, y) {
		this.setDspXY(
			this.prjToDspX(prjX),
			this.prjToDspY(prjY),
			x, y);
	},
	
	setGlbXY: function(glbX, glbY, x, y) {
		var prj=this.prj;
		this.setPrjXY(prj.fwdX(glbX), prj.fwdY(glbY), x, y);
	}
};


/**
 * Initialize an existing DOM element as a map.  All internal map structures
 * are added before any existing content in the element.
 *
 * <h2>Sizing</h2>
 * The map size must be explicitly maintained.  If not specified, then the natural
 * size of the containing element is used.  If this natural size ever changes,
 * setSize() must be called to reset it.
 * 
 * @example
 * var map=new nanomaps.MapSurface(someElement);
 * map.attach(new nanomaps.TileLayer({ 
 *    tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png" }));
 * 
 * @constructor
 * @extends nanomaps.EventEmitter
 * @name nanomaps.MapSurface
 * @param {HTMLElement} elt The map container element
 * @param {integer} [options.width] Explicit width of the map
 * @param {integer} [options.height] Explicit height of the map
 * @param {number} [options.resolution] Initial resolution
 * @param {Projection} [options.projection=new nanomaps.WebMercatorProjection()] Map projection 
 * @param {LatLngObject} [options.center] Initial center of the map
 */
function MapSurface(elt, options) {
	if (!options) options={};
	var document=options.document||elt.ownerDocument||window.document,
		width=options.width, height=options.height, attr,
		mapState,
		viewportElt, glassElt, managedElt, projection;
		
	// Local functions
	function createElement(name) {
		return document.createElement(name);
	}
	
	/**
	 * Create an element in the document that this map exists in.
	 * @methodOf nanomaps.MapSurface#
	 * @name createElement
	 * @return {HTMLElement}
	 */
	this.createElement=createElement;
	
	// Hardcode some important styles
	elt.style.overflow='hidden';
	if (!isPositioned(elt))
		elt.style.position='relative';	// Make positioned
	
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
	glassElt.style.display='block';
	elt.insertBefore(glassElt, elt.firstChild);
	
	
	// create viewport
	viewportElt=createOverlay();
	viewportElt.className='viewport';
	elt.insertBefore(viewportElt, elt.firstChild);
	
	// create managed
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
	
	
	// Initial mapState
	this.mapState=mapState=new MapState();
	mapState.prj=options.projection||new Projections.WebMercator();
	mapState.res=options.resolution||mapState.prj.DEFAULT_RESOLUTION;

	// Fixed size or autosize
	if (typeof width!=='number' || typeof height!=='number') {
		this.setSize();
		// Auto width/height (get inner size)
		width=elt.clientWidth;
		height=elt.clientHeight;
	} else {
		this.setSize(width, height);
	}
	
	// Initialization hook
	this.initialize(options);
	
	// Collect loose content
	this.collect();
}
var MapSurfaceMethods=MapSurface.prototype=new EventEmitter();

/**
 * If x is defined, return it cast as a number.  Otherwise, return width/2
 */
function optionalX(map, x) {
	return (x===undefined||x===null) ? map.mapState.w/2 : Number(x);
}

/**
 * If y is defined, return it cast as a number.  Otherwise, return height/2
 */
function optionalY(map, y) {
	return (y===undefined||y===null) ? map.mapState.h/2 : Number(y);
}

/**
 * Clamp the given zoom level to the valid range
 */
function clampZoom(map, level) {
	var prj=map.mapState.prj;
	level=Number(level);
	
	// Not much to do here - but letting an NaN in is like inviting
	// a vampire into your house
	if (isNaN(level)) level=prj.MAX_LEVEL;
	
	if (level<prj.MIN_LEVEL) level=prj.MIN_LEVEL;
	else if (level>prj.MAX_LEVEL) level=prj.MAX_LEVEL;
	return level;
}

/**
 * Get the current zoom level
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getZoom
 * @return the current zoom level as a floating point number
 */
MapSurfaceMethods.getZoom=function() {
	return this.mapState.getZoom();
};

/**
 * Set the map zoom level, optionally preserving the display position
 * of the given viewport coordinates.
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getZoom
 * @param level {number} Floating point zoom level (clamped to valid range)
 * @param x {number||undefined} x viewport coordinate to preserve (default=center)
 * @param y {number||undefined} y viewport coordinate to preserve (default=center)
 * @return the current zoom level as a floating point number
 */
MapSurfaceMethods.setZoom=function(level, x, y) {
	var mapState=this.mapState,
		origRes=mapState.res;

	level=clampZoom(this, level);
	this.mapState.setZoom(level, optionalX(this,x), optionalY(this,y));
	
	if (mapState.res!==origRes) {
		this._invalidate(true);
	}
};

/**
 * Gets the global location as a Coordinate object at the given
 * viewport coordinates.  If coordinates are ommitted/undefined,
 * then the center is assumed.
 */
MapSurfaceMethods.getLocation=function(x,y) {
	var mapState=this.mapState;
	x=optionalX(this,x);
	y=optionalY(this,y);
	return Coordinate.xy(
		mapState.getGlbX(x,y),
		mapState.getGlbY(y,y)
	);
};

/**
 * Set the map to the given global coordinates at the given
 * viewport coordinates (default to map center).
 * The first argument must either be a Coordinate object
 * or something that is coercible from Coordinate.from(...).
 * Examples: Coordinate.latLng(39,-104), {lat:39,lng:-104}.
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name setLocation
 * @param globalCoord {Coordinate coercible}
 * @param x viewport coordinate to set location relative to
 * @param y viewport coordinate to set location relative to
 */
MapSurfaceMethods.setLocation=function(globalCoord, x, y) {
	globalCoord=Coordinate.from(globalCoord);
	this.mapState.setGlbXY(globalCoord._x, globalCoord._y, optionalX(this,x), optionalY(this,y));
	this._invalidate(false);
};

MapSurfaceMethods._invalidate=function(full) {
	// Update the offset of the managed container
	var managed=this.elements.managed,
		mapState=this.mapState;
	
	managed.style.left=(-mapState.x) + 'px';
	managed.style.top=(-mapState.y) + 'px';
	
	if (full) this._notifyReset();
	else this._notifyPosition();
};

/**
 * Iterate over each child element of the global layer, invoking
 * callback.  The this reference is preserved as this instance in
 * calls.
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _each
 */
MapSurfaceMethods._each=function(includeManaged, callback) {
	var elements=this.elements, managed=elements.managed, viewport=elements.viewport;
	for (var childElt=viewport.firstChild; childElt; childElt=childElt.nextSibling) {
		if (childElt.nodeType!==1 || childElt===managed) continue;	// Skip non-elements
		callback.call(this, childElt);
	}
	if (includeManaged) {
		for (childElt=managed.firstChild; childElt; childElt=childElt.nextSibling) {
			if (childElt.nodeType!==1) continue;	// Skip non-elements
			callback.call(this, childElt);
		}
	}
};

/**
 * Iterate over contained global elements and trigger listeners.
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _notifyPosition
 */
MapSurfaceMethods._notifyPosition=function() {
	this._each(true, function(element) {
		var delegate=element.mapDelegate||{},
			handler=delegate.onposition;
		if (typeof handler==='function') {
			handler.call(delegate, this, element);
		}
	});
};

/**
 * Reset all elements
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _notifyReset
 */
MapSurfaceMethods._notifyReset=function() {
	this._each(true, this._notifyResetSingle);
};

/**
 * Reset a single element
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _notifyResetSingle
 */
MapSurfaceMethods._notifyResetSingle=function(element) {
	var delegate=element.mapDelegate||DEFAULT_MAP_DELEGATE,
		handler=delegate.onreset;
	if (typeof handler==='function')
		handler.call(delegate, this, element);
	
};

/**
 * Initialization hook.  Performs initialization after map structures have
 * been initialized but before content is added to the map.  This method
 * does nothing but is an override hook for adding additional functionality.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name initialize
 */
MapSurfaceMethods.initialize=function(options) {
};

/**
 * Translates a mouse event to viewport relative coordinates and returns
 * {x:, y: }
 * <p>TODO: Fix this.  It doesn't work in a number of corner cases.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name eventToContainer
 * @param {string} event DOM event object
 * @param {string} [elementName='viewport'] Relative to which element in the containment hierarchy
 *
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
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name routeDomEvent
 * @deprecated
 *
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

/**
 * Adds content to the map.  This is the primary method of attaching DOM content
 * to the map after construction.  Give it either an HTMLElement or a factory
 * object that supports a createElement(mapSurface) method.
 * 
 * <h2>Display Management</h2>
 * The primary thing that map content needs to be able to do is position itself
 * relative to a global coordinate system.  Each element managed by the map
 * viewport is checked for a special "mapDelegate" property.  If defined, then
 * this delegate object provides callbacks that will be invoked on map geometry
 * changes and are responsible for displaying the element properly.  See the
 * documentation for a complete treatment of MapDelegate objects.
 *
 * <h2>Default Behavior</h2>
 * If an element added to the map does not have a mapDelegate property, the
 * default delegate is used instead.  This default delegate defines standard
 * and intuitive behavior for positioning a simple object.  The position and
 * pixel offset are determined by taking the first defined result from the
 * following sequence:
 * <ol>
 * <li>If the "geo" property exists on the DOM object.  Take the "latitude", 
 *		"longitude", "x" and "y" properties.
 * <li>Read the "latitude" and "longitude" attributes of the element.
 * </ol>
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name attach
 * @param {HTMLElement or factory} element Element or factory to add
 * @return {HTMLElement} the element attached
 */
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
	
	return element;
};

/**
 * Collects all unattached DOM elements from the container which have geo
 * referencing information and attaches them.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name collect
 * @param {HTMLElement or factory} element Element or factory to add
 */
MapSurfaceMethods.collect=function() {
	for (var child=this.elements.parent.firstChild; child; child=child.nextSibling) {
		if (child.nodeType===1 && child.hasAttribute('latitude') && child.hasAttribute('longitude')) {
			this.attach(child);
		}
	}
};

/**
 * Attaches or updates an element.  If the element is already a child of the
 * map viewport, then it is "reset" (its position is updated).  Otherwise, this
 * acts like a call to attach.  This method is only designed to take an element,
 * not a factory.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name update
 * @param {HTMLElement} element
 */
MapSurfaceMethods.update=function(element) {
	var parent=element.parentElement, elements=this.elements;
	if (parent!==elements.viewport&&parent!==elements.managed) this.attach(element);
	else this._notifyResetSingle(element);
	return element;
};

/**
 * Set the width/height of the map.  The style.width and style.height is always
 * hardcoded so as to avoid strange effects if the container changes size.
 * <p>
 * If no arguments are given, the container element's size is set to automatic,
 * its natural width/height are measured, and this size is used to lay out the map.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name setSize
 * @param {integer} width
 * @param {integer} height
 */
MapSurfaceMethods.setSize=function(width, height) {
	var elt=this.elements.parent, center=this.getLocation(),
		mapState=this.mapState;
	if (arguments.length<2) {
		elt.style.width='';
		elt.style.height='';
		width=elt.clientWidth;
		height=elt.clientHeight;
	}
	
	elt.style.width=width+'px';
	elt.style.height=height+'px';
	
	mapState.w=width;
	mapState.h=height;
	
	this.setLocation(center);
};

/**
 * Reposition the map by the given number of pixels expressed as pixels east
 * and north.
 * 
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name moveBy
 * @param {Number} eastingPx Number of pixels to the right (east) to move towards
 * the center
 * @param {Number} northingPx Number of pixels to the top (north) to move towards
 * the center
 */
MapSurfaceMethods.moveBy=function(eastingPx, northingPx) {
	var location=this.getLocation(eastingPx, - northingPx);
	this.setLocation(location, 0, 0);
};


/**
 * @private
 * @return {longitude:, latitude:, xoffset:, yoffset:}
 */
function extractDefaultPosition(element) {
	var geo=element.geo;
	if (!geo) {
		geo={};
		if (isNaN(geo.latitude=Number(element.getAttribute('latitude')||'NaN'))) return null;
		if (isNaN(geo.longitude=Number(element.getAttribute('longitude')||'NaN'))) return null;
		geo.xoffset=Number(element.getAttribute('xoffset')||'NaN');
		geo.yoffset=Number(element.getAttribute('yoffset')||'NaN');
	}
	return geo;
}

/**
 * Defult delegate for positioned objects that don't supply their own.
 * @private
 */
var DEFAULT_MAP_DELEGATE={
	onreset: function(map, element) {
		var geo=extractDefaultPosition(element), xy;
		if (geo) {
			// Calculate position
			xy=map.transform.toSurface(geo.longitude, geo.latitude);
			if (xy) {
				xy[0]+=Number(geo.xoffset||0);
				xy[1]+=Number(geo.yoffset||0);
				
				// set position
				element.style.left=(xy[0])+'px';
				element.style.top=(xy[1])+'px';
				element.style.display='block';
				return;
			}
		}
		
		// If here, then geo information was non-conclusive.  Hide the
		// element
		element.style.display='none';
	}
};


// Exports
exports.MapSurface=MapSurface;


