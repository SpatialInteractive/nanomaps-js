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
 * <p>
 * Note that the MapState is a quasi-internal object.  It is used directly
 * by code integrating into nanomaps, but users generally will not/should not
 * encounter it.  It's methods are terse and no validity checks are done
 * on arguments.  That is left to higher level code.
 *
 * @constructor
 * @name nanomaps.MapState
 */
function MapState(other) {
	if (other) {
		other.copy(this);
	} else {
		this.prj=null;
		this.res=1;
		this.x=0;
		this.y=0;
		this.w=0;
		this.h=0;
	}
	
	/**
	 * If this state represents a transitional state on the way to
	 * some final state, then that final state will be set here.
	 * This is intended to be used by components that either may just
	 * take a swag during transitions or may wish to preload resources
	 * based on final states instead of intermediate.
	 * @public
	 * @name finalState {MapState}
	 * @memberOf nanomaps.MapState#
	 */
	this.finalState=null;
}
MapState.prototype={
	/**
	 * Detect the level of change between this mapState and a comparison
	 * mapState.
	 * @public
	 * @name compare
	 * @methodOf nanomaps.MapState.prototype
	 * @param other {MapState}
	 * @return {Number} 0 if no change, 1 if position change, 2 if full change
	 */
	compare: function(other) {
		var ret=0;
		if (this.x!==other.x || this.y!==other.y || this.w!==other.w || this.h!==other.h) {
			ret=1;
		}
		
		if (this.prj!==other.prj || this.res!==other.res) {
			ret=2;
		}
		
		return ret;
	},
	
	/**
	 * Copy parameters from this mapState to dest
	 * @public
	 * @name copy
	 * @methodOf nanomaps.MapState.prototype
	 * @param dest {MapState}
	 */
	copy: function(dest) {
		dest.x=this.x;
		dest.y=this.y;
		dest.w=this.w;
		dest.h=this.h;
		dest.prj=this.prj;
		dest.res=this.res;
	},
	
	/// -- Getters
	/**
	 * @public
	 * @name getZoom
	 * @methodOf nanomaps.MapState.prototype
	 */
	getZoom: function() {
		return this.prj.toLevel(this.res);
	},
	
	/**
	 * Return the x-coordinate in display space of the given viewport
	 * coordinates.  Note this function takes (x,y) as it is forward
	 * designed to be able to represent orientation.
	 * <p>
	 * This value will be resolution pre-divided
	 * @public
	 * @name getDspX
	 * @methodOf nanomaps.MapState.prototype
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
	 * @public
	 * @name getDspY
	 * @methodOf nanomaps.MapState.prototype
	 */
	getDspY: function(x,y) {
		return this.y+y;
	},
	
	/**
	 * Get projected x-coordinate of the given viewport coordinates.
	 * Note that these coordinates will have resolution multiplied out
	 * and will have axis inversion relative to display coordinates
	 * if the proejction defines it.
	 * @public
	 * @name getPrjX
	 * @methodOf nanomaps.MapState.prototype
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
	 * @public
	 * @name getPrjY
	 * @methodOf nanomaps.MapState.prototype
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
	 * @public
	 * @name getGlbX
	 * @methodOf nanomaps.MapState.prototype
	 */
	getGlbX: function(x,y) {
		return this.prj.invX(this.getPrjX(x,y));
	},
	
	/**
	 * Return global y coordinate corresponding to viewport coordinate (x,y).
	 * @public
	 * @name getGlbY
	 * @methodOf nanomaps.MapState.prototype
	 */
	getGlbY: function(x,y) {
		return this.prj.invY(this.getPrjY(x,y));
	},
	
	/// -- calculations
	/**
	 * @public
	 * @name prjToDspX
	 * @methodOf nanomaps.MapState.prototype
	 */
	prjToDspX: function(prjX) {
		var prj=this.prj;
		if (prj.XINVERTED) {
			prjX=prj.PRJ_EXTENT.maxx - prjX;
		}
		return prjX / this.res;
	},
	
	/**
	 * @public
	 * @name prjToDspY
	 * @methodOf nanomaps.MapState.prototype
	 */
	prjToDspY: function(prjY) {
		var prj=this.prj;
		if (prj.YINVERTED) {
			prjY=prj.PRJ_EXTENT.maxy - prjY;
		}
		return prjY / this.res;
	},
	
	/// -- Setters
	/**
	 * @public
	 * @name setRes
	 * @methodOf nanomaps.MapState.prototype
	 */
	setRes: function(res, x, y) {
		if (res!==this.res) {
			var prjX=this.getPrjX(x,y), prjY=this.getPrjY(x,y);
			this.res=res;
			this.setPrjXY(prjX, prjY, x, y);
		}
	},
	
	/**
	 * @public
	 * @name setZoom
	 * @methodOf nanomaps.MapState.prototype
	 */
	setZoom: function(level, x, y) {
		this.setRes(this.prj.fromLevel(level), x, y);
	},
	
	/**
	 * @public
	 * @name setDspXY
	 * @methodOf nanomaps.MapState.prototype
	 */
	setDspXY: function(dspX, dspY, x, y) {
		this.x=dspX-x;
		this.y=dspY-y;
	},
	
	/**
	 * @public
	 * @name setPrjXY
	 * @methodOf nanomaps.MapState.prototype
	 */
	setPrjXY: function(prjX, prjY, x, y) {
		this.setDspXY(
			this.prjToDspX(prjX),
			this.prjToDspY(prjY),
			x, y);
	},
	
	/**
	 * @public
	 * @name setGlbXY
	 * @methodOf nanomaps.MapState.prototype
	 */
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
		eventLayer,
		mapState,
		projection;
		
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
	this._layers=[];
	this._surfaces=[];
	
	// Hardcode some important styles
	elt.nmt='parent';
	elt.style.overflow='hidden';
	if (!isPositioned(elt))
		elt.style.position='relative';	// Make positioned
	
	// Dictionary of elements
	this.elements={
		document: document,
		parent: elt
	};
	
	// Setup the event layer
	eventLayer=this.layer(LAYER_NAMES.EVENT);
	eventLayer.style.position='absolute';
	eventLayer.style.left='0px';
	eventLayer.style.top='0px';
	eventLayer.style.width='100%';
	eventLayer.style.height='100%';
	this.elements.event=eventLayer;
	
	// Display mapState
	/**
	 * MapState object currently being displayed.  This does not
	 * contain uncommitted changes.
	 * @public
	 * @memberOf nanomaps.MapSurface#
	 * @name mapState
	 */
	this.mapState=mapState=new MapState();
	mapState.prj=options.projection||new Projections.WebMercator();
	mapState.res=options.resolution||mapState.prj.DEFAULT_RESOLUTION;
	this._zoomBias=options.zoomBias||0;
	
	// Pending mapState
	this._pendMapState=new MapState(mapState);
	this._pendLock=0;
	this._pendAnim=null;
	
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

var LAYER_NAMES={
	BACKGROUND: 0,
	MAP: 10,
	SHADOW: 50,
	EVENT: 100,
	OVERLAY: 1000,
	FOREGROUND: 10000
};

function layerIndexToOrdinal(index) {
	// See if the index is really a layer name
	var ordinal=LAYER_NAMES[String(index).toUpperCase()];
	if (ordinal === undefined) {
		// Parse it as a number
		ordinal=parseInt(index);
		if (isNaN(ordinal)) ordinal=LAYER_NAMES.FOREGROUND;
	}
	return ordinal;
}

function makeMapStateFramer(map, initialMapState, finalMapState) {
	// Copy mapStates (the references we are given are "live")
	// and record strides
	var resStride=finalMapState.res - initialMapState.res,
		xInitial=initialMapState.getPrjX(0,0),
		yInitial=initialMapState.getPrjY(0,0),
		xStride=finalMapState.getPrjX(0,0) - xInitial,
		yStride=finalMapState.getPrjY(0,0) - yInitial,
		wStride=finalMapState.w - initialMapState.w,
		hStride=finalMapState.h - initialMapState.h;
	initialMapState=new MapState(initialMapState);
	finalMapState=new MapState(finalMapState);
	updateMapState=new MapState(initialMapState);
	
	//console.log('Animation framer: resStride=' + resStride + ', xStride=' + xStride + ', yStride=' + yStride + ', wStride=' + wStride + ', hStride=' + hStride);
	
	return function(n, xy, isFinal) {
		var pct=xy[0], changeLevel;
		if (isFinal) {
			updateMapState=finalMapState;
			map._pendAnim=null;
			map.mapState.finalState=null;
		} else {
			//console.log('Anim frame ' + pct);
			updateMapState.res=initialMapState.res + pct * resStride;
			updateMapState.setPrjXY(xInitial + pct * xStride, yInitial + pct * yStride, 0, 0);
			updateMapState.w=initialMapState.w + pct * wStride;
			updateMapState.h=initialMapState.h + pct * hStride;
		}
		
		changeLevel=updateMapState.compare(map.mapState);
		if (changeLevel>0) {
			updateMapState.copy(map.mapState);
			map._invalidate(changeLevel>1);
		}
	};
}

/**
 * Begin a series of mapState changes including changes to position, size,
 * resolution and projection.  Calling this method increments an internal
 * lock count.  If the lock count is zero (default), then all changes to
 * map state take effect immediately.  If it is >0 (as is the case after a
 * call to begin), then the changes are "batched" up until a later call
 * to commit or rollback.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name begin
 * @return true if this starts a new transaction and false if it just incremented
 * the lock count on an already started transaction
 */
MapSurfaceMethods.begin=function() {
	return this._pendLock++ === 0;
};

/**
 * Rolls back all pending map state changes made since the first begin().  Note that
 * nested rollbacks (ie. savepoints in SQL parlance) are not supported.  Rollback 
 * resets the entire transaction.  Future calls to commit will have no effect since
 * the transaction lock will be zero.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name rollback
 */
MapSurfaceMethods.rollback=function() {
	// Copy back from the display mapState
	this.mapState.copy(this._pendMapState);
	this._pendLock=0;
};

/**
 * Commit a pending transaction, optionally animating between the current display
 * state and changes introduced in the transaction.  Passing any true value as the
 * animate parameter will enable animation.  If passing a non-null object, then it
 * will be taken as animation parameters and will be passed through unchanged to the
 * Animation() constructor.  The following animation options are settable:
 * <ul>
 * <li>curve: An animation curve function such as one produced by MakeBezierCurve(x1,y1,x2,y2).
 * Defaults to a bezier curve with a pronounced tail acceleration
 * <li>duration: Duration in seconds.  Default to 0.5.
 * <li>rate: Frame rate in frames/s.  Default=20 but may be automatically adjusted based on platform 
 * or previous preformance.
 * </ul>
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name commit
 * @param animate {boolean|Object} false to disable animation, true or animation options to animate
 * @return true if this call to commit finished the transaction.  false if this commit
 * did nothing
 */
MapSurfaceMethods.commit=function(animate) {
	if (this._pendLock<=0 || --this._pendLock>0) return false;
	
	// Let's do it
	var pendMapState=this._pendMapState,
		mapState=this.mapState,
		animOptions;
		
	var changeLevel=pendMapState.compare(mapState);
	if (changeLevel>0) {
		// Something changed
		// Interrupt any pending animation
		if (this._pendAnim) {
			this._pendAnim.interrupt();
			this._pendAnim=null;
			mapState.finalState=null;
		}
		
		if (!animate) {
			// Directly update
			pendMapState.copy(mapState);
			this._invalidate(changeLevel>1);
		} else {
			// Start an animation
			if (typeof animate==='object') animOptions=animate;
			mapState.finalState=new MapState(pendMapState);
			this._pendAnim=new Animation(makeMapStateFramer(this, mapState, pendMapState), animOptions);
			this._pendAnim.start();
		}
	}
	
	return true;
};

/**
 * Forcefully commits the current transaction regardless of
 * the number of outstanding begins.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name commit
 */
MapSurfaceMethods.forceCommit=function() {
	this._pendLock=1;
	this.commit();
};

/**
 * All map objects exist within a layer.  Layers are ordered by an ordinal index
 * and correspond to a div within the main map div.  Each layer div is identified
 * by an attribute "layer" with its numeric layer value.  In this way, loose objects
 * that need to exist in the layer hierarchy can have their "layer" attribute
 * set to have them positioned in the correct place.  Loose objects without a layer
 * are assumed to have a layer index of infinity, making them foreground objects.
 * <p>
 * This method will return a div for the layer.  If the layer does not exist, it
 * will be created.
 * <p>
 * Layers do not establish a positioning context, inheriting the context of the
 * containing map div.  They also have zero width and height but are set to display
 * overflow.  The system may make the special events layer positioned with full width
 * and height, but this is considered a special case.
 * <p>
 * The following layer names are acceptable arguments to index in addition to numeric
 * values:
 * <ul>
 * <li>background (0): The background layer will contain background drawables, generally the
 * thatch pattern that is below the map
 * <li>map (10): The map layer should contain views for drawing the map (ie MapTileView)
 * stacked in order of display.
 * <li>event (100): Touch events are handled from this layer.  This layer is special.
 * <li>shadow (500): By convention, the SHADOW layer is where you will want to put overlay shadows
 * <li>overlay (1000): By convention, the OVERLAY layer is where map overlays and markers should
 * be added
 * <li>foreground (10000): Extreme foreground layer.  This is where unattached map objects go and
 * is synonymous with infinity.
 * </ul>
 * Layer names are case insensitive.  The event layer is a special 100% width/height layer
 * that catches all background events.  Anything below this ordinal will not receive any ui
 * events. 
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name layer
 * @param index The layer name or ordinal value of the desired layer
 * @return layer div corresponding to index
 */
MapSurfaceMethods.layer=function(index) {
	var parent=this.elements.parent,
		layers=this._layers,
		layer, i,
		ordinal=layerIndexToOrdinal(index),
		childOrdinal,
		insertionPoint;
		
	// Look it up in our cache
	for (i=0; i<layers.length; i++) {
		layer=layers[i];
		if (layer.ordinal===ordinal) return layer;
	}
	
	// Need to create it
	layer=this.createElement('div');
	layer.ordinal=ordinal;
	layer.nmt='layer';
	layer.setAttribute('layer', String(ordinal));	// For debugging in inspector.  Not used otherwise.
	layer.style.width='0px';
	layer.style.height='0px';
	layers.push(layer);
	
	// Find insertion point
	for (insertionPoint=parent.firstChild; insertionPoint; insertionPoint=insertionPoint.nextSibling) {
		if (insertionPoint.nodeType===1 && insertionPoint.nmt) {
			childOrdinal=insertionPoint.ordinal;
			if (childOrdinal!==undefined && childOrdinal>ordinal)
				break;
		}
	}
	
	// Put it before the insertionPoint or as the last element
	parent.insertBefore(layer, insertionPoint);
	
	return layer;
};

/**
 * Within each layer is a so-called "managed surface".  This div is maintained as the
 * first child of each layer and has its position managed by the system in such a way
 * that children placed within it at coordinates returned by globalXY (TODO) will always
 * move with the map.
 * <p>
 * This method returns the managed surface div associated with a layer.  Most map objects
 * end up in the managed div.
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name layer
 * @param index The layer name or ordinal value of the desired layer
 * @return surface div corresponding to index
 */
MapSurfaceMethods.surface=function(index) {
	var ordinal=layerIndexToOrdinal(index),
		mapState=this.mapState,
		surfaces=this._surfaces,
		surface, i,
		layer;
	for (i=0; i<surfaces.length; i++) {
		surface=surfaces[i];
		if (surface.ordinal===ordinal) return surface;
	}
	
	// Not found - create
	surface=this.createElement('div');
	surface.ordinal=ordinal;
	surface.nmt='surface';
	surface.className='managed';	// To make it obvious in inspector - not used otherwise
	surface.style.position='absolute';
	surface.style.left=(-mapState.x) + 'px';
	surface.style.top=(-mapState.y) + 'px';
	surfaces.push(surface);
	
	// Add to layer
	layer=this.layer(ordinal);
	layer.insertBefore(surface, layer.firstChild);
	
	return surface;
};

/**
 * Get the current zoom level
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getZoom
 * @return the current zoom level as a floating point number
 */
MapSurfaceMethods.getZoom=function() {
	return this._pendMapState.getZoom()-this._zoomBias;
};

/**
 * Set the map zoom level, optionally preserving the display position
 * of the given viewport coordinates.
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getZoom
 * @param level {number} Floating point zoom level (clamped to valid range)
 * @param x {Number||undefined} x viewport coordinate to preserve (default=center)
 * @param y {Number||undefined} y viewport coordinate to preserve (default=center)
 * @return the current zoom level as a floating point number
 */
MapSurfaceMethods.setZoom=function(level, x, y) {
	var mapState=this._pendMapState,
		origRes=mapState.res;

	this.begin();
	level=clampZoom(this, level+this._zoomBias);
	mapState.setZoom(level, optionalX(this,x), optionalY(this,y));
	this.commit();
};

/**
 * Zoom in by one zoom level, rounding to the nearest integral
 * zoom level.
 * @public
 * @name zoomIn
 * @methodOf nanomaps.MapSurface.prototype
 * @param x {Number||undefined} x viewport coordinate to preserve (default=center)
 * @param y {Number||undefined} y viewport coordinate to preserve (default=center)
 */
MapSurfaceMethods.zoomIn=function(x,y) {
	this.setZoom(Math.round(this.getZoom()+1), x, y);
},

/**
 * Zoom out by one zoom level, rounding to the nearest integral
 * zoom level.
 * @public
 * @name zoomOut
 * @methodOf nanomaps.MapSurface.prototype
 * @param x {Number||undefined} x viewport coordinate to preserve (default=center)
 * @param y {Number||undefined} y viewport coordinate to preserve (default=center)
 */
MapSurfaceMethods.zoomOut=function(x,y) {
	this.setZoom(Math.round(this.getZoom()-1), x, y);
},

/**
 * Gets the global location as a Coordinate object at the given
 * viewport coordinates.  If coordinates are ommitted/undefined,
 * then the center is assumed.
 * @public
 * @name getLocation
 * @methodOf nanomaps.MapSurface.prototype
 * @param x {Number|undefined} viewport x coordinate
 * @param y {Number|undefined} viewport y coordinate
 * @return {nanomaps.Coordinate}
 */
MapSurfaceMethods.getLocation=function(x,y) {
	var mapState=this._pendMapState;
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
	this.begin();
	this._pendMapState.setGlbXY(globalCoord._x, globalCoord._y, optionalX(this,x), optionalY(this,y));
	this.commit();
};

/**
 * Update the positioning of all managed surfaces and
 * notify children of reset (if full) or position (if !full).
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _invalidate
 */
MapSurfaceMethods._invalidate=function(full) {
	// Update the offset of all managed surfaces and
	var mapState=this.mapState,
		surfaces=this._surfaces,
		surface, i;
	
	for (i=0; i<surfaces.length; i++) {
		surface=surfaces[i];
		surface.style.left=(-mapState.x) + 'px';
		surface.style.top=(-mapState.y) + 'px';
	}
	
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
MapSurfaceMethods._each=function(includeSurfaces, callback) {
	var layers=this._layers,
		surfaces=this._surfaces,
		container,
		i, childElt;
		
	// Iterate over layers
	for (i=0; i<layers.length; i++) {
		container=layers[i];
		for (var childElt=container.firstChild; childElt; childElt=childElt.nextSibling) {
			if (childElt.nodeType!==1 || childElt.nmt==='surface') 
				continue;	
				// Skip non-elements and surfaces
				
			callback.call(this, childElt);
		}
	}
	
	// Iterate over surfaces
	if (includeSurfaces) {
		for (i=0; i<surfaces.length; i++) {
			container=surfaces[i];
			for (var childElt=container.firstChild; childElt; childElt=childElt.nextSibling) {
				if (childElt.nodeType!==1) 
					continue;	
					// Skip non-elements
					
				callback.call(this, childElt);
			}
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
	this._each(false, function(element) {
		var peer=element.mapeer||DefaultAttachmentPeer;
		if (isFunction(peer.maposition))
			peer.maposition(this, element);
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
	var peer=element.mapeer||DefaultAttachmentPeer;
	if (isFunction(peer.mareset))
		peer.mareset(this, element);
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
	var relativeTo=this.elements[elementName||'parent'], start=relativeTo,
		coords={x: event.clientX, y: event.clientY}, eltZoom;
	
	do {
		eltZoom=parseInt(getComputedStyle(start, 'zoom'))||1;
		
		coords.x-=start.offsetLeft;
		coords.y-=start.offsetTop;
		
		coords.x/=eltZoom;
		coords.y/=eltZoom;
	} while (start=start.offsetParent);
	
	// Add window.page?Offset
	coords.x+=window.pageXOffset||0;
	coords.y+=window.pageYOffset||0;
	
	return coords;
};

/**
 * Get the element associated with an attachment
 * @private
 */
function getAttachmentElement(mapSurface, attachment) {
	if (isHtmlElement(attachment)) return attachment;
	if (!attachment || !isFunction(attachment.getElement))
		throw new Error('Object ' + attachment + ' is not a valid Attachment');
	return attachment.getElement(mapSurface);
}

/**
 * Adds content to the map.  This is the primary method of attaching DOM content
 * to the map after construction.  Give it either an HTMLElement or an Attachment
 * object that supports the Attachable protocol.
 *
 * <h2>Design Pattern</h2>
 * Internally, the MapSurface works solely with content that is raw DOM elements.
 * It is expected that any active DOM elements on the map can be associated with
 * an AttachmentPeer object that manages the display lifecycle of the elements
 * while on the map surface.  Connecting an HTMLElement to its AttachmentPeer can
 * be done by setting the element's "mapeer" (Map-Attachment Peer) property to its
 * peer object.  If this property is not set, then each element will share a single
 * global AttachmentPeer providing default behaviour.  See Default Behavior below.
 * <p>
 * It is often desirable to maintain a high-level JavaScript object providing a
 * structured API for manipulating the element's content.  This API is most easily
 * expressed on the Attachment object, which can maintain a reference to the MapSurface
 * and the AttachmentPeer.  This is precisely how the high level provided attachments
 * function (markers, SVG, TileLayer, etc).
 * <p>
 * It is acknowledged that this peer structure is somewhat awkward but it is done to
 * support reference models that do not require circular references ensnaring DOM references.
 * In 2011, the state of such things is better than it was designing an API that requires
 * circular references is still a recipe for creating sluggish garbage collection at best
 * and browser-bug induced leaks at worst.
 *
 * <h2>Objects</h2>
 * The following classes or interfaces participate to manage an element's display on the map:
 * <ul>
 * <li>HTMLElement - Actual DOM element representing the content
 * <li>Attachment - Optional object that references the element and provides a user-level api
 * for manipulating the content
 * <li>AttachmentPeer - Object attached to the HTMLElement which manages the display state
 * <li>MapSurface - The target of the attachment
 * <li>DefaultAttachmentPeer - Default peer used if an HTMLElement does not supply its own peer.
 * </ul>
 * 
 * There are multiple ways to combine and/or collapse these items.  An API could be constructed
 * for example that just adds methods directly to an HTMLElement and makes it do everything.
 * The built-in map attachments, however follow a pattern with references in the following pattern:
 * <pre>
 * 	MapSurface  ----> HTMLElement  ----> AttachmentPeer
 * 	    ^              ^
 * 	    |             /
 * 	Attachment  -----/
 * </pre>
 *
 * An Attachment will host the user-level API and maintain references to the MapSurface and
 * the HTMLElement.  The HTMLElement references the AttachmentPeer via its mapeer property.
 * The AttachmentPeer does not maintain a reference to any of the other objects.  All of its
 * methods accept the objects it needs to operate against as arguments.  In this way, the peer
 * can either be a stateless singleton or allocated per attachment.
 * 
 * <h3>Associating an HTMLElement with an AttachmentPeer</h3>
 * The peer for an HTMLElement is located in the following way:
 * <ol>
 * <li>If the HTMLElement.mapeer property is set, use that
 * <li>If the HTMLElement.mapself property === true, then the element should
 * be considered its own peer
 * <li>The global DefaultAttachmentPeer is used
 * </ol>
 *
 * <h3>Attachment API</h3>
 * In order for an arbitrary object to be attached to the map, it should support
 * the following properties/methods:
 * <ul>
 * <li>defaultLayer:Number|String - If specified, this is the default layer
 * that should host the object (unless if an explicit layer was passed to attach).
 * Defaults to "overlay" if not present.
 * <li>unmanaged:Boolean - If true, then the attachment is added to the dom
 * under the root layer, otherwise, it is added under the surface layer (which
 * is positioned based on map movement)
 * <li>getElement(MapSurface):HTMLElement - Attaches or reattaches this Attachment
 * object to the given MapSurface.  Should return the HTMLElement representing
 * the attachment
 * </ul>
 * 
 * Note in particular that there is no detach method.  Attachments can be
 * removed by either removing the corresponding HTMLElement or calling MapSurface.detach
 * with the Attachment object. 
 *
 * <h3>AttachmentPeer API</h3>
 * Attachment peers should implement the following:
 * <ul>
 * <li>maposition(MapSurface,HTMLElement) - If defined, called whenever the map's position
 * changes
 * <li>mareset(MapSurface,HTMLElement) - If defined, called whenever the map's resolution or
 * other parameter changes which is considered a "heavy weight" change
 * </ul>
 *
 * <h1>The following is old docs</h1>
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
 * @param {String or Number} options.layer The target layer
 * @return {HTMLElement} the element attached
 */
MapSurfaceMethods.attach=function(attachment, options) {
	if (!options) options={};
	var layerSpec=options.layer,
		unmanaged=options.unmanaged,
		parent,
		element=getAttachmentElement(this, attachment);
	
	if (attachment!==element) {
		// Process as attachment
		if (!layerSpec) layerSpec=attachment.defaultLayer;
		unmanaged=attachment.unmanaged;
	}
	
	// Make sure it is positioned
	element.style.position='absolute';
	
	parent=unmanaged ? this.layer(layerSpec) : this.surface(layerSpec);
	if (element.parentNode===parent) {
		// Already attached to the right place
		return;
	}
	
	try {
		parent.appendChild(element);
	} catch (e) {
		throwNotDomElement(element);
	}
	
	// Send it a reset event
	this._notifyResetSingle(element);
	
	return element;
};

/**
 * Convenience method to balance calls to attach.  Gets the element associated
 * with the attachment and removes it from the DOM tree.  It is also perfectly
 * acceptable to remove the element yourself.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name detach
 * @param {HTMLElement or Attachment} attachment
 */
MapSurfaceMethods.detach=function(attachment) {
	var element=getAttachmentElement(this, attachment);
	if (element.parentNode) element.parentNode.removeChild(element);
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
	/* TODO
	for (var child=this.elements.parent.firstChild; child; child=child.nextSibling) {
		if (child.nodeType===1 && child.hasAttribute('latitude') && child.hasAttribute('longitude')) {
			this.attach(child);
		}
	}
	*/
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
MapSurfaceMethods.update=function(attachment) {
	var element=getAttachmentElement(this, attachment),
		parent=element.parentNode;
	if (!parent || !parent.nmt) this.attach(attachment);
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
		mapState=this._pendMapState;
		
	this.begin();
	
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
	
	this.commit();
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
 * Returns a Coordinate object for the xy (left/top) position
 * on the managed surface given global coordinates.  This is a
 * low-level function for use by map attachments that need to
 * manage their position on the managed attachment div.  Always
 * operates on the display MapState, not any pending MapState
 * within a transaction.
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name globalToXY
 * @param {Coordinate} object coercible to global coordinate
 * @return {Coordinate} xy value for placement on the managed div
 */
MapSurfaceMethods.globalToXY=function(globalCoord) {
	var mapState=this.mapState,
		prj=mapState.prj,
		x, y;
	globalCoord=Coordinate.from(globalCoord);
	
	x=mapState.prjToDspX(prj.fwdX(globalCoord._x));
	y=mapState.prjToDspY(prj.fwdY(globalCoord._y));
	
	return (isNaN(x) || isNaN(y)) ? null: new Coordinate(x,y);
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
var DefaultAttachmentPeer={
	mareset: function(map, element) {
		var geo=extractDefaultPosition(element), xy, x, y;
		if (geo) {
			// Calculate position
			xy=map.globalToXY(geo);
			if (xy) {
				x=xy.x()+Number(geo.xoffset||0);
				y=xy.y()+Number(geo.yoffset||0);
				
				// set position
				element.style.left=(x)+'px';
				element.style.top=(y)+'px';
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
exports.DefaultAttachmentPeer=DefaultAttachmentPeer;

