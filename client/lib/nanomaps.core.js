/**
nanomaps.core.js
Core map display library.
*/

/**
 * @namespace
 */
var nanomaps=(function(exports) {
var __nextId=0;

/**
 * EventEmitter base class.  Based on Node.js EventEmitter.
 * @class
 * @name nanomaps.EventEmitter
 */
function EventEmitter() {
}

var EventEmitterMethods=EventEmitter.prototype={};

/**
 * If called without a name, returns the object of event lists.
 * If called with a name, returns the event list for the given
 * name.  Always allocates objects as necessary.
 *
 * @private
 * @methodOf nanomaps.EventEmitter
 * @name _evt
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

/**
 * Add an event listener that will be invoked on every following occurence of the
 * named event.  The listener is invoked with <b>this</b> equal to the instance
 * that raised the event and arguments specific to the event type.
 * 
 * The method "on" is a synonym of addListener.
 * 
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name addListener
 * @param {string} event Event name to add listener to
 * @param {function} listener Callback to be invoked on event
 */
EventEmitterMethods.addListener=EventEmitterMethods.on=function(event, listener) {
	this._evt(event).push(listener);
};

/**
 * Add an event listener that will be invoked on the very next occurence of the
 * named event.  The listener is invoked with <b>this</b> equal to the instance
 * that raised the event and arguments specific to the event type.
 *
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name once
 * @param {string} event Event name to add listener to
 * @param {function} listener Callback to be invoked on event
 */
EventEmitterMethods.once=function(event, listener) {
	this._evt(event+'$once').push(listener);
};

/**
 * Remove a previously added listener.  Does nothing if the given listener
 * is not found.
 
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name removeListener
 * @param {string} event Event name to add listener to
 * @param {function} listener Previously added callback to remove
 */
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

/**
 * Remove all listeners for a given event.
 *
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name removeAllListeners
 * @param {string} event Event name to add listener to
 */
EventEmitterMethods.removeAllListeners=function(event) {
	this._evt(event).length=0;
	this._evt(event+'$once').length=0;
};

/**
 * Invokes a given event by name, triggering all registered persistent listeners
 * and once only listeners.  All arguments after the first are taken to be the
 * arguments to the event listeners.  Once only listeners are invoked first
 * followed by persistent listeners.  Otherwise, listeners are invoked in the
 * order added.
 * <p>
 * If a method exists on the instance named 'on' + event, then that method
 * will be invoked as an event listener prior to any others.
 *
 * <p><i>TODO: Make listener add/remove durable from within a callback</i>
 *
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name emit
 * @param {string} event Event name to add listener to
 * @param ... Arguments to registred listeners 
 */
EventEmitterMethods.emit=function(event /*, arg1..argn */) {
	var i, list, eventArgs=Array.prototype.slice.call(arguments, 1),
		handler=this['on' + event];
	
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
	list==this._evt(event);
	for (i=0; i<list.length; i++) {
		list[i].apply(this, eventArgs);
	}
};

/**
 * Overrides the given methodName on this instance applying the given
 * advice ("before" or "after").  The given target method is invoked
 * for the advice.
 * 
 * <p>Invoking this method supports the arbitrary augmentation of a class's
 * methods with before or after advice.  The original method is replaced with
 * a stub that invokes a list of other methods before and after the original
 * target.  If the original method doesn't exist, the stub will still be
 * defined.
 * <p>It is safe to use this method on prototypes or instances as it will only
 * modify the outermost prototype (target of the call).
 *
 * @example MapSurface.prototype.advise('initialize', 'after', 
 *		function() { alert('Initialized'); });
 * @example myMap.advise('onzoom', 'after', 
 *		function() { alert('zoomed'); });
 * @public
 * @methodOf nanomaps.EventEmitter.prototype
 * @name advise
 * @param {string} methodName Name of the method to override
 * @param {string} advice Advice to apply ("before" or "after")
 * @param {function} target Function which is the target of advice
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

/**
 * @private
 */
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
 *
 * @private
 */
function createDomEventDispatcher(target, eventName) {
	return function(event) {
		target.emit(eventName, event||window.event, this);
	};
}

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
		viewportElt, glassElt, managedElt, center, projection;
		
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
	attr=elt.style.position;
	if (attr!='relative' && attr!='absolute' && attr!='fixed')
		elt.style.position='relative';	// Make positioned
	
	/* Disable z-index stuff until we can determine actual z-index from css
	attr=elt.style.zIndex;
	if (attr==='' || attr==='auto')
		elt.style.zIndex='inherit';	// Establish a new stacking context
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
	glassElt.style.display='block';
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
	
	// Setup initial state by setting center
	this.setCenter(center);
	
	// Initialization hook
	this.initialize(options);
	
	// Collect loose content
	this.collect();
}
var MapSurfaceMethods=MapSurface.prototype=new EventEmitter();
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
	if (parent!==elements.viewport||parent!==elements.managed) this.attach(element);
	else this._notifyResetSingle(element);
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
 * Set the map center to the given global coordinates as specified by the
 * object with properties "lat" and "lng".
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name setCenter
 * @param {LatLng object} centerLatLng
 */
MapSurfaceMethods.setCenter=function(centerLatLng) {
	this._updateCenter(centerLatLng);	
	this._notifyPosition();
};

/**
 * Internal method - update the center but don't notify layers of a
 * position change.
 * @private
 * @methodOf nanomaps.MapSurface.prototype
 * @name _updateCenter
 * @param {LatLng object} centerLatLng
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

/**
 * Return a reference to the current center object, having fields "lat"
 * and "lng".
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getCenter
 * @return {LatLng object}
 */
MapSurfaceMethods.getCenter=function() {
	return this._center;
};

/**
 * Get the current resolution in projection units per pixel (most commonly
 * meters/pixel).
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getResolution
 * @return {Number}
 */
MapSurfaceMethods.getResolution=function() {
	return this.transform.res;
};

/**
 * Change the map resolution, optionaly preserving the global coordinates
 * under an arbitrary location on the map viewport.  If preserveXY is not
 * given, then the coordinates at the center are preserved.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name setResolution
 * @param {Number} resolution
 * @param {XY object} [preserveXY] Object with "x" and "y" properties specifying
 * 		a point on the viewport measured from the upper-left
 */
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

/**
 * Change the map resolution by specifying a projection dependent level, 
 * optionaly preserving the global coordinates
 * under an arbitrary location on the map viewport.  If preserveXY is not
 * given, then the coordinates at the center are preserved.
 * <p>
 * The mapping between level and resolution is done by the projection.  For the
 * default WebMercator projection, the level is a positive number representing
 * the power of two decimation factor.  It can take any floating point value
 * (not just integers) and is interpolated using 2^x exponentiation or a base
 * 2 logarithm.
 * 
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name setLevel
 * @param {Number} level Floating point level between the projections minimum and
 * 		maximum zoom level (if out of these bounds, it is clamped to min/max
 *		values)
 * @param {XY object} [preserveXY] Object with "x" and "y" properties specifying
 * 		a point on the viewport measured from the upper-left
 */
MapSurfaceMethods.setLevel=function(level, preserveXY) {
	var prj=this.transform.prj, minLevel=prj.MIN_LEVEL, maxLevel=prj.MAX_LEVEL;
	
	if (!level) return;
	if (level>maxLevel) level=maxLevel;
	else if (level<minLevel) level=minLevel;
	
	this.setResolution(prj.fromLevel(level), preserveXY);
};

/**
 * Get the current level that represents the map's resolution.  This is a
 * calculated value based on the projection, but it is usually a real number,
 * not necessarily an integer.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name getLevel
 * @return {Number}
 */
MapSurfaceMethods.getLevel=function() {
	var transform=this.transform;
	return transform.prj.toLevel(transform.res);
};

/**
 * Given x,y coordinates relative to the visible area of the viewport,
 * return the corresponding lat/lng.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name toLatLng
 * @param {Number} x coordinate measured from the left of the viewport
 * @param {Number} y coordinate measured from the top of the viewport
 * @return {LatLng object}
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
 * projected pixel coordinates relative to the managed layer coordinate system.  
 * Note that this assumes an axis inversion
 * on the y-axis (ie. Increasing "y" parameters will produce decreasing "y"
 * results).  This method is used for a number of internal calculations but
 * is unlikely to be of use to end-callers.
 *
 * @public
 * @methodOf nanomaps.MapSurface.prototype
 * @name toGlobalPixels
 * @param {Number} x coordinate measured from the left of the viewport
 * @param {Number} y coordinate measured from the top of the viewport
 * @return {XY object}
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
	var latLng=this.toLatLng(this.width/2 + eastingPx, this.height/2 - northingPx);
	//console.log('moveto: lat=' + latLng.lat + ', lng=' + latLng.lng + ' for deltax=' + eastingPx + ', deltay=' + northingPx);
	if (latLng) this.setCenter(latLng);
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

/**
 * Construct a new MapTransform with the given parameters.  Implementations
 * will typically call init(...) next.  Note that this class typically represents
 * longitude and latitude as ordered arrays as [longitude, latitude], corresponding
 * to x and y.
 * 
 * @class
 * @name nanomaps.MapTransform
 * @public
 */
function MapTransform() {
	this.sequence=__nextId++;
}
MapTransform.prototype=
/**
 * @lends nanomaps.MapTransform.prototype
 */
{
	/**
	 * @public
	 * @param {Projection object} projection map projection
	 * @param {Number} resolution the resolution that the transform describes
	 * @param {Array[lng,lat]} Longitude/Latitude corresponding to the viewport
	 * zero pixel coordinate
	 */
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
	 * @public
	 * @param {Number} resolution new resolution
	 * @param {Array[lng,lat]} zeroLngLat new zero point
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
	 * @public
	 * @param {Number} lng longitude
	 * @param {Number} lat latitude
	 * @return {Array[x,y]} Global projected pixels of the given lng/lat
	 */
	toPixels: function(lng, lat) {
		var xy=this.prj.forward(lng, lat), resolution=this.res;
		if (!xy) return null;
		xy[0]/=resolution;
		xy[1]/=resolution;
		
		return xy;
	},
	
	/**
	 * Return surface coordinates of the given lat/lng (offset relative to
	 * the zero point)
	 * @public
	 * @param {Number} lng longitude
	 * @param {Number} lat latitude
	 * @return {Array[x,y]} Surface pixels of the given lng/lat
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
	 * @public
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Array[lng,lat]} Lng/lat corresponding to the global pixels
	 
	 */
	fromPixels: function(x, y) {
		var resolution=this.res;
		return this.prj.inverse(x * resolution, y * resolution);
	},
	
	/**
	 * Convert from surface coordinates to [lng, lat] offset from the zero point.
	 * @public
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Array[lng,lat]} Lng/lat corresponding to the suface pixels
	 */
	fromSurface: function(x, y) {
		return this.fromPixels(x+this.zpx[0], this.zpx[1] - y);	// Note Y axis inversion
	}
};

/**
 * @namespace Projections
 * @name nanomaps.Projections
 */
var Projections={
	/**
	 * Standard "Web Mercator" projection as used by Google, Microsoft, OSM, et al.
	 * Instantiate as new WebMercator(options). 
	 * @class
	 * @name nanomaps.Projections.WebMercator
	 * @param {Number} [options.MIN_LEVEL=1]
	 * @param {Number} [options.MAX_LEVEL=18]
	 */
	WebMercator: function(options) {
		if (!options) options={};
		/**
		 * Default center for this projection
		 * @public
		 * @name DEFAULT_CENTER
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.DEFAULT_CENTER={lat:39.7406, lng:-104.985441};
		/**
		 * Default resolution for this projection
		 * @public
		 * @name DEFAULT_RESOLUTION
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.DEFAULT_RESOLUTION=611.4962;
	
		var EARTH_RADIUS=6378137.0,
			DEG_TO_RAD=.0174532925199432958,
			RAD_TO_DEG=57.29577951308232,
			FOURTHPI=0.78539816339744833,
			HALFPI=1.5707963267948966,
			HIGHEST_RES=78271.5170;
		
		/**
		 * Minimum valid level
		 * @public
		 * @name MIN_LEVEL
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.MIN_LEVEL=options.MIN_LEVEL||1;
		/**
		 * Maximum valid level
		 * @public
		 * @name MAX_LEVEL
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.MAX_LEVEL=options.MAX_LEVEL||18;
		
		/**
		 * Convert from global to projected units 
		 * @public
		 * @name forward
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @param {Number} y
		 * @return {Array[x,y]}
		 */
		this.forward=function(x, y) {
			return [
				x*DEG_TO_RAD * EARTH_RADIUS, 
				Math.log(Math.tan(FOURTHPI + 0.5 * DEG_TO_RAD * y)) * EARTH_RADIUS 
			];
		};
		
		/**
		 * Convert from projected to global units 
		 * @public
		 * @name inverse
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @param {Number} y
		 * @return {Array[x,y]}
		 */
		this.inverse=function(x, y) {
			return [
				RAD_TO_DEG * x / EARTH_RADIUS,
				RAD_TO_DEG * (HALFPI - 2. * Math.atan(Math.exp(-y/EARTH_RADIUS)))
			];
		};
		
		/**
		 * Return the resolution (m/px) for the given zoom index given a standard
		 * power of two zoom breakdown.
		 * @public
		 * @name fromLevel
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} level
		 * @return {Number} resolution
		 */
		this.fromLevel=function(level) {
			return HIGHEST_RES/Math.pow(2, level-1);
		};
		
		/**
		 * Return the level for the given resolution on the standard power of
		 * two scale.
		 * @public
		 * @name toLevel
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} resolution
		 * @return {Number} level
		 */
		this.toLevel=function(resolution) {
			return Math.log(HIGHEST_RES/resolution) / Math.log(2) + 1;
		};
		
		// release memory from closure
		options=null;
	}
};



// Exports
exports.EventEmitter=EventEmitter;
exports.MapSurface=MapSurface;
exports.Projections=Projections;
exports.MapTransform=MapTransform;

// module suffix
return exports;
})({});


