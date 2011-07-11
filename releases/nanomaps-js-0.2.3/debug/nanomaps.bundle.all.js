/*!
 * Nanomaps JavaScript Library
 * https://github.com/SpatialInteractive/nanomaps-js
 * Copyright 2011, Stella Laurenzo
 * Licensed under the MIT open source license
 * Version 0.2.3
 * Built by: stella@rhea at Mon Jul 11 16:05:27 PDT 2011
 * Origin: git@github.com:SpatialInteractive/nanomaps-js.git 
 * Branch: master
 * Revision: d81d3503befd934bdb369f94f84cf42da2ab014d
 */
(function(global) {
var exports={};
global.nanomaps=exports;
/**
 * nanomaps.util.js
 * The final resting place of bits that don't fit anywhere
 * else and tend to be on the lower end of the dependency
 * graph.
 */
 
///// Some standard utilities
function createFunction() {
	return function() { }
}

// Use a native Object.create if found.  Otherwise, simulate one
function ObjectCreate(proto) {
	if (Object.create) return Object.create(proto);
	var ctor;
	if (proto) {
		ctor=createFunction();
		ctor.prototype=proto;
		return new ctor();
	}
	return {};
}

/**
 * Takes a constructor written according to the following pattern and
 * updates its prototype chain to inherit from the given superCtor's
 * prototype.
 * <pre>
 * function BaseClass() {
 * }
 * BaseClass.prototype={
 *   // base class properties
 * };
 *
 * function DerivedClass() {
 *   BaseClass.call(this);
 * }
 * DerivedClass.prototype={
 *   // derived properties
 * };
 * inherits(DerivedClass, BaseClass)
 * </pre>
 * 
 * Note that the original DerivedClass.prototype is discarded as part of this
 * operation, being used solely to initialize the newly created inherited
 * prototype.
 * @public
 */
function inherits(ctor, superCtor) {
	var newProto=ObjectCreate(superCtor.prototype);
	ObjectCopy(ctor.prototype, newProto);
	ctor.prototype=newProto;
}

/**
 * Copy all own properties from src to dest (creating if needed)
 * @return dest
 */
function ObjectCopy(src, dest) {
	dest=dest||{};
	if (src) {
		for (var k in src) {
			if (src.hasOwnProperty(k))
				dest[k]=src[k];
		}
	}
	return dest;
}

exports.ObjectCreate=ObjectCreate;
exports.ObjectCopy=ObjectCopy;
exports.inherits=inherits;

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
	list=this._evt(event);
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
 * Return current time millis
 */
function now() {
	return new Date().getTime();
}

function isFunction(value) {
	return typeof value === 'function';
}

function throwNotDomElement(value) {
	throw new Error('Object ' + value + ' is not a DOM element');
}

function dupArray(ary) {
	return Array.prototype.slice(ary);
}

exports.EventEmitter=EventEmitter;

/**
 * nanomaps.dom.js
 * Core dom utilities.  We don't depend on third-party libs so
 * port the boiler-plate idiocy here.
**/

// Feature detection
var hasAddEventListener=!!window.addEventListener;

function getComputedStyle(elt, prop) {
	if (elt.currentStyle) {
		// IE
		return elt.currentStyle[prop];
	} else if (window.getComputedStyle) {
		// DOM
		return elt.ownerDocument.defaultView.getComputedStyle(elt,'').getPropertyValue(prop);
	}
	return '';
}

function isPositioned(elt) {
	var attr=getComputedStyle(elt, 'position');
	return attr==='relative' || attr==='absolute' || attr==='fixed';
}

function isHtmlElement(object) {
	// Detect if HTMLElement in standards compliant way with fallbacks for IE
	return window.HTMLElement ? object instanceof HTMLElement : (object.nodeType===1);
}

function addEventListener(target, eventName, listener) {
	target.addEventListener(eventName, listener, false);
}

function removeEventListener(target, eventName, listener) {
	target.removeEventListener(eventName, listener, false);
}

function isLeftClick(event) {
	// TODO: IE needs some TLC here.  For it, button==1 for
	// left click
	if (hasAddEventListener) {
		return event.button===0;
	} else {
		return event.button===1;
	}
}

function stopEvent(event) {
	if (event.stopPropagation) {
		event.preventDefault();
		event.stopPropagation();
	} else {
		event.cancelBubble = true;
		event.returnValue = false;
	}
}

function div() {
	return document.createElement('div');
}

/**
 * nanomaps.geometry.js
 * Geometry primitives
 */

// Helpers to get x/y alias names
var X_NAMES=['x', 'lng', 'longitude', 'lon'],
	Y_NAMES=['y', 'lat', 'latitude'];
function firstNumeric(object, props) {
	var i,v,t;
	for (i=0; i<props.length; i++) {
		v=object[props[i]];
		if (v!==undefined && v!==null) {
			t=typeof v;
			if (t==='number') return v;
			else if (t==='function') return Number(v.call(object));
		}
	}
	return NaN;
}
	
/**
 * Abstracts out a single point in a global coordinate system.
 * This may be neurotic, but my brain is wired to think of (latitude,longitude)
 * and when its in that mode, I can't get it in my head that x=longitude and
 * y=latitude (in fact, just after writing this sentence I had to read it 3 times
 * because that didn't quite look right).  
 * As a further neurosis, I spent my productive map-engaged years abbreviating them (lat,lng).
 * <p>
 * So the presence of this class is a tip of the hat to the fact that no one
 * can cure the brain and quirky habits are better indulged in old age than
 * challenged.  Everyone else can just go on using (x,y) and remembering
 * the difference.  I name things explicitly here so as not to get confused.  Surely
 * a lifetime of abuse is worth a few bytes in a library.
 * <p>
 * The entire rest of the library deals in (x,y).  I've tried to keep any concept
 * of latitude and longitude here in the form of helper methods.  The "public" api
 * should pass around instances of this class.  The bits under the covers, though
 * will often just passes x's and y's nakedly (ie. see MapState).
 * <p>
 * This class is also structured to allow some future refactoring to support double
 * or integral E6 coordinates.  This could save some space with lots instances (maybe,
 * depending on alignment) but my intuition tells me it is probably not a speed savings
 * since we've got to go back to double anyway for projection math.  In my experience
 * this is usually a premature optimization, but I leave the option open by way of a subclass.
 * <p>
 * Ok, that's enough of a treatise on a simple Coordinate class.
 *
 * @constructor
 * @name nanomaps.Coordinate
 * @param x horizontal coordinate
 * @param y vertical coordinate
 * @author stella
 */
function Coordinate(x,y) {
	this._x=Number(x);
	this._y=Number(y);
}
/**
 * Static function for returning a coordinate given
 * latitude,longitude.  This is here just to make sure
 * I get it right instead of relying on my memory that
 * lat=y and lng=x.
 * @public
 * @name latLng
 * @methodOf nanomaps.Coordinate
 * @param lat {Number}
 * @param lng {Number}
 * @return {Coordinate}
 */
Coordinate.latLng=function(lat, lng) {
	return new Coordinate(lng, lat);
};

/**
 * Factory method for constructing a coordinate from (x,y)
 * @public
 * @name xy
 * @methodOf nanomaps.Coordinate
 * @param x {Number}
 * @param y {Number}
 * @return {Coordinate}
 */
Coordinate.xy=function(x,y) {
	return new Coordinate(x,y);
};

/**
 * Generic conversion function to produce a Coordinate
 * from a variety of objects.  If object is a Coordinate,
 * then object is returned as-is.  Otherwise, the x-coordinate
 * is determined by the first existent property:
 * <ol>
 * <li>x
 * <li>lng
 * <li>longitude
 * <li>lon
 * </ol>
 * The y coordinate is the first property:
 * <ol>
 * <li>y
 * <li>lat
 * <li>latitude
 * </ol>
 * 
 * Alternatively, if object is an array, then it is
 * taken to be [x, y]
 * @public
 * @name from
 * @methodOf nanomaps.Coordinate
 * @param object {Object}
 * @return {Coordinate}
 */
Coordinate.from=function(object) {
	if (object instanceof Coordinate) {
		return object;
	}
	if (object instanceof Array) {
		return new Coordinate(object[0], object[1]);
	}
	var x=firstNumeric(object, X_NAMES),
		y=firstNumeric(object, Y_NAMES);
	return new Coordinate(x,y);
};

Coordinate.prototype={
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	x: function() {
		return this._x;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	y: function() {
		return this._y;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	lat: function() {
		return this._y;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	lng: function() {
		return this._x;
	}
};
exports.Coordinate=Coordinate;

/**
 * Simple bounds class with members:
 * <ul>
 * <li>minx
 * <li>miny
 * <li>maxx
 * <li>maxy
 * </ul>
 
 * @constructor
 * @name nanomaps.Bounds
 * @param minx {number}
 * @param miny {number}
 * @param maxx {number}
 * @param maxy {number}
 */
function Bounds(minx,miny,maxx,maxy) {
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.minx=minx;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.miny=miny;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.maxx=maxx;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.maxy=maxy;
}

/**
 * Convert tile x,y,level coordinates to a Microsoft
 * quad-key
 */
function tileXYToQuadkey(tileX, tileY, level) {
	var i, mask, value, ret='';
	for (i=level; i>0; i--) {
		value=48;
		mask=1<<(i-1);
		if ((tileX&mask)!==0) value++;
		if ((tileY&mask)!==0) value+=2;
		ret+=String.fromCharCode(value);
	}
	return ret;
}


/**
 * nanomaps.projections.js
 * Currently just the WebMercator projection
 */
 
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
		
		/**
		 * WebMercator does not have an x inversion
		 * @public
		 * @name XINVERTED
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.XINVERTED=false;

		/**
		 * WebMercator <b>does</b> have a y inversion
		 * @public
		 * @name XINVERTED
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.YINVERTED=true;
		
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
		 * Convert from global to projected units (x) 
		 * @public
		 * @name fwdX
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @return {Number}
		 */
		this.fwdX=function(x) {
			return x*DEG_TO_RAD * EARTH_RADIUS; 
		};


		/**
		 * Convert from global to projected units (y) 
		 * @public
		 * @name fwdY
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} y
		 * @return {Number}
		 */
		this.fwdY=function(y) {
			return Math.log(Math.tan(FOURTHPI + 0.5 * DEG_TO_RAD * y)) * EARTH_RADIUS; 
		};
		
		/**
		 * Convert from projected to global units (x) 
		 * @public
		 * @name invX
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @return {Number}
		 */
		this.invX=function(x) {
			return RAD_TO_DEG * x / EARTH_RADIUS;
		};

		/**
		 * Convert from projected to global units (y) 
		 * @public
		 * @name invY
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} y
		 * @return {Number}
		 */
		this.invY=function(y) {
			return RAD_TO_DEG * (HALFPI - 2. * Math.atan(Math.exp(-y/EARTH_RADIUS)));
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

		/**
		 * Bounds object defining map extent in global
		 * coordinates.
		 * @public
		 * @name GLOBAL_EXTENT
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		var GLB_EXTENT=this.GLB_EXTENT=new Bounds(
			-180.0, -85.05112878, 180.0, 85.05112878
			);
			
		/**
		 * Bounds object defining map extent in projected
		 * coordinates
		 * @public
		 * @name GLOBAL_EXTENT
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.PRJ_EXTENT=new Bounds(
			this.fwdX(GLB_EXTENT.minx),
			this.fwdY(GLB_EXTENT.miny),
			this.fwdX(GLB_EXTENT.maxx),
			this.fwdY(GLB_EXTENT.maxy)
			);
		
		// release memory from closure
		options=null;
	}
};

exports.Projections=Projections;

/**
 * nanomaps.animation.js
 * Simple animation support as needed to support map
 * transitions and such.
 */

/**
 * Construct a function that returns points along a
 * bezier curve defined by control points (x1,y1)
 * and (x2,y2).  The endpoints of the curve are
 * (0,0) and (1,1).
 * <p>
 * The returned function(t, xy) takes argument t
 * and an array of [x,y] for the result.  It returns
 * the array.  If xy is not defined on input, a new
 * array is created.  Therefore calling the function
 * as "xy=curve(t)" is acceptable.
 *
 * @public
 * @name nanomaps.MakeBezierCurve
 * @return {Function} curve(t,xy) returning xy
 */
function MakeBezierCurve(x1, y1, x2, y2) {
	// Calculate coefficients
	var cx=3*x1,
		bx=3*(x2-x1) - cx,
		ax=1 - cx - bx,
		cy=3*y1,
		by=3*(y2-y1) - cy,
		ay=1 - cy - by;
	return function(t, xy) {
		if (!xy) xy=[];
		var t2=t*t, t3=t2*t;
		
		xy[0]=ax*t3 + bx*t2 + cx*t;
		xy[1]=ay*t3 + by*t2 + cy*t;
		
		return xy;
	};
}

var ANIMATION_DEFAULT_OPTIONS={
	curve: MakeBezierCurve(0.25, 0.25, 0.25, 0.25),
	duration: 0.5,
	rate: 10
};

/**
 * Construct a new one-shot animation with the given framer function
 * and options.  The framer function is called for each frame and
 * has signature:
 * <pre>
 *		function framer(frameNumber, xy, final)
 * </pre>
 *
 * Immediately upon a call to start() the framer will be called as
 * framer(0, [0,0], false).  Just after the final frame, it will be
 * called as framer(n, [1,1], true), where n is the total number
 * of frames not counting initial and final.  The final framer invocation
 * can happen at any time, even if no previous frames have been invoked
 * and should immediately conclude whatever transition is being controlled.
 * <p>
 * The framer function will always be invoked with a this reference equal
 * to the animation.
 *
 * @public
 * @constructor
 * @name nanomaps.Animation
 * @param framer {Function} Callback for each frame
 * @param options.curve {Function(t,xy):xy} Curve function as returned by MakeBezierCurve
 * @param options.duration {Number} Real time length of the sequence
 * @param options.rate {Number} Desired frame rate (frames/s) 
 */
function Animation(framer, options) {
	if (!options) options=ANIMATION_DEFAULT_OPTIONS;
	this._f=framer;
	this._c=options.curve||ANIMATION_DEFAULT_OPTIONS.curve;
	this._d=options.duration||ANIMATION_DEFAULT_OPTIONS.duration;
	this._r=options.rate||ANIMATION_DEFAULT_OPTIONS.rate;
	this._s=0;	// State=Not Started
}
Animation.prototype={
	/**
	 * Start the animation.
	 * @public
	 * @name start
	 * @methodOf nanomaps.Animation.prototype
	 */
	start: function() {
		if (this._s!==0) return;
		
		var self=this, divisions, interval;
		// Setup initial conditions
		self._ts=now();				// Time start
		self._td=self._d*1000;
		self._te=self._ts+self._td; // Time end
		self._tn=0;					// Frame number
		
		divisions=self._d*self._r;	// Time division (number of frames)
		interval=(self._te-self._ts) / divisions;
		if (interval<=0) {
			// Illegal.  Jump straight to end
			self._s=2;	// State=Finished
			self._f(0, [0,0], true);
		} else {
			// Tee 'er up
			self._s=1;	// State=Running
			self._ii=setInterval(function() {
				self._frame();
			}, interval);
			
			// Initial frame
			self._frame();
		}
	},
	
	/**
	 * If the animation is running or has not started, immediately
	 * finishes it, jumping to the final state.
	 * @public
	 * @name finish
	 * @methodOf nanomaps.Animation.prototype
	 */
	finish: function() {
		this._last();
	},
	
	/**
	 * If the animation is running, cancel any further frames but
	 * do not jump to the final state.  Use this if you are introducing
	 * an additional animation that needs to visually pick up where this
	 * one currently is and supercedes this animation's final result.
	 * @public
	 * @name interrupt
	 * @methodOf nanomaps.Animation.prototype
	 */
	interrupt: function() {
		var self=this, ii=self._ii;
		if (self._s===2) return;	// Already finished
		if (ii) clearInterval(ii);
		self._s=2;
	},
	
	/**
	 * Called on each frame.
	 */
	_frame: function() {
		var self=this, 
			time=now(), 
			t=(time-self._ts)/self._td,
			xy;
		if (t>=1.0 || t<0 || isNaN(t)) {
			// Done
			self._final();
			return;
		}
		
		xy=self._c(t);
		self._f(++self._tn, xy, false);
	},
	
	_final: function() {
		var self=this, ii=self._ii;
		if (self._s===2) return;	// Already finished
		if (ii) clearInterval(ii);
		self._s=2;
		self._f(self._tn, [1,1], true);
		self._f=null;
	}
};


exports.MakeBezierCurve=MakeBezierCurve;
exports.Animation=Animation;

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

/**
 * nanomaps.tiles.js
 * Provide an "image mosaic" tile layer that can be attach()'d to
 * a MapSurface.  The original version of this module served as the
 * basis for the android version, where further inspiration was had
 * and was then ported back to this version.
 * See the net.rcode.nanomaps.tile package.
**/

/**
 * Construct a standard TileLayer that can be attached to a MapSurface.  If a
 * TileSelector is not passed in the options, then a default is constructed and
 * options are passed to it.  See the options accepted by the TileSelector
 * constructor for additional parameters.
 *
 * @example 
 * var map=new nanomaps.MapSurface(someElement);
 * map.attach(new nanomaps.TileLayer({ 
 *    tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png" })); 
 *
 * @class
 * @name nanomaps.TileLayer
 * @param {TileSelector} [options.selector] describes the source and geometry of the
 * tiles
 * @param {integer} [options.buffer=64] The number of pixels to actively buffer on
 * @param {Number} [options.pixelRatio=1.0] The ratio of tilepixel / csspixel
 * @param {Number} [options.autoPixelRatio=false] If no pixelRatio is given consult the browser to determine native ratio
 * all sides of the map
 */
function TileLayer(options) {
	if (!options) options={};
	/**
	 * The TileLayerPeer object
	 * @name peer
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var peer=this.peer=new TileLayerPeer();
	var sel=peer.sel=new CartesianTileSelector(options);
	
	/**
	 * Ratio of tilePixel / cssPixel.  This will be 1.0 on most displays.
	 * On high density displays, setting this to 2.0 may result in better
	 * visual clarity.
	 * @name pixelRatio
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var explicitPixelRatio=Number(options.pixelRatio);
	if (!explicitPixelRatio && options.autoPixelRatio) {
		explicitPixelRatio=window.devicePixelRatio;
	}
	
	/**
	 * Ratio of tilePixel / cssPixel.  This will be 1.0 on most displays.
	 * On high density displays, setting this to 2.0 may result in better
	 * visual clarity.
	 * @name pixelRatio
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	sel.pixelRatio=peer.pixelRatio=this.pixelRatio=explicitPixelRatio||1.0;
	
	/**
	 * The element that is the root of the TileLayer
	 * @name element
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var element=this.element=document.createElement('div');
	element.style.position='absolute';
	element.style.left='0px';
	element.style.top='0px';
	if (explicitPixelRatio) {
		element.style.zoom=(1/explicitPixelRatio);
	}
	element.mapeer=peer;
	element.setAttribute('tilesrc', sel.toString());	// For DOM debugging
}
TileLayer.prototype={
	/**
	 * (Attachment Api) Tile layers are unmanaged attachments
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	unmanaged: true,
	
	/**
	 * (Attachment Api) Default attachment layer is 'map'.
	 * For touch support it is imperitive that the map layer
	 * is below the event layer because touch state will be lost
	 * if the event ever attaches to nodes that are removed
	 * are the target of a touch event.
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	defaultLayer: 'map',

	/**
	 * (Attachment Api) Get the element that should be attached
	 * to the map.
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	getElement: function(mapSurface) {
		/**
		 * When a TileLayer has been attached to a map, its owner
		 * property is the owning MapSurface
		 * @public
		 * @memberOf nanomaps.TileLayer#
		 */
		this.owner=mapSurface;
		return this.element;
	}
};

/**
 * Peer object for TileLayers
 * @private
 * @name nanomaps.TileLayerPeer
 * @constructor
 */
function TileLayerPeer() {
	// TileSets
	this.lockedState=null;
	this.current=new TileSet();
	this.old=new TileSet();
	this.transition=new TileSet();
}
TileLayerPeer.prototype={
	/**
	 * @private
	 */
	maposition: function(map, element) {
		this.mareset(map, element);
	},
	
	/**
	 * Populates the transition TileSet with tiles for the given mapState.
	 * A lot of this code is semi-duplicated in onreset but with minor twists
	 * and I've not been able to condense them into one without breaking things.
	 * @private
	 */
	loadPendingTiles: function(mapState) {
		var transitionTileSet=this.transition,
			currentTileSet=this.current,
			pixelRatio=this.pixelRatio,
			right=pixelRatio * (mapState.w-1),
			bottom=pixelRatio * (mapState.h-1),
			updatedKeys,
			i,
			key,
			tile,
			newTiles=[];
		
		//console.log('Loading pending tiles for target state ' + mapState.res);
		
		transitionTileSet.clear();
		// Select tiles that intersect our display area
		updatedKeys=this.sel.select(mapState.prj,
			mapState.res / pixelRatio,
			mapState.getPrjX(0,0),
			mapState.getPrjY(0,0),
			mapState.getPrjX(right,bottom),
			mapState.getPrjY(right,bottom));
		
		// Match them up against what we are already displaying
		for (i=0; i<updatedKeys.length; i++) {
			key=updatedKeys[i];
			tile=currentTileSet.move(key, transitionTileSet);
			if (!tile) {
				// We only create a new transitional tile if the tile isn't
				// on the current display
				tile=new Tile(this.sel, key);
				transitionTileSet.add(tile);
				newTiles.push(tile);
				setTileBounds(mapState, tile, pixelRatio);
			}
		}
		
		// Sort and load
		sortTiles(newTiles, pixelRatio*mapState.w/2, pixelRatio*mapState.h/2);
		for (i=0; i<newTiles.length; i++) {
			tile=newTiles[i];
			// Load the tiles but don't generate previews because
			// no other tilesets are referenced to the same display.
			// We'll need to generate previews when we actually go
			// to use them later
			tile.loading=true;
			this.sel.loadTile(tile, null, true);
		}
	},
	
	/**
	 * TODO: Port transition parts back in later
	 * @private
	 */
	mareset: function(map, element) {
		var currentTileSet=this.current,
			transitionTileSet=this.transition,
			oldTileSet=this.old,
			mapState=map.mapState,
			lockedState=this.lockedState,
			pixelRatio=this.pixelRatio,
			right=pixelRatio*(mapState.w-1),
			bottom=pixelRatio*(mapState.h-1),
			updatedKeys,
			i,
			key,
			tile,
			newTiles=[];
		
		if (lockedState!==mapState.finalState) {
			// Handle transition and detransition
			lockedState=this.lockedState=mapState.finalState;

			// Dump pending tiles into current for consideration in the main loop
			//console.log('Transitional end state changed: Sweeping tiles to current');
			//transitionTileSet.sweep(currentTileSet);
			//console.log('Tiles swept to current');
			
			if (lockedState) {
				// Load tiles for a new final state
				this.loadPendingTiles(lockedState);
			}
		}
		
		//console.log('TileLayer.onreset(transition locked=' + (!!lockedState) + ')');
		currentTileSet.resetMarks();
		
		// Select tiles that intersect our display area
		updatedKeys=this.sel.select(mapState.prj,
			mapState.res / pixelRatio,
			mapState.getPrjX(0,0),
			mapState.getPrjY(0,0),
			mapState.getPrjX(right,bottom),
			mapState.getPrjY(right,bottom));

		// Match them up against what we are already displaying
		for (i=0; i<updatedKeys.length; i++) {
			key=updatedKeys[i];
			tile=currentTileSet.get(key) || transitionTileSet.move(key, currentTileSet);

			// If we're not in a transitional state.
			// If the tile is marked temporary, then disregard it
			// because we don't want half rendered crap anymore.
			// Just the good stuff for us from here on out.
			if (!lockedState && tile && tile.temporary) tile=null;

			// Still no tile?  Create one.
			if (!tile) {
				tile=new Tile(this.sel, key);
				if (lockedState) tile.temporary=true;
				currentTileSet.add(tile);
			}
			tile.mark=true;
			
			setTileBounds(mapState, tile, pixelRatio);

			// After a transition we may be dealing with a child that
			// was loaded without ever being attached.  Fix that now.
			if (!tile.parent) {
				// Not yet added to display.  Put it in the list
				// to be fixed up as a new tile
				newTiles.push(tile);
			}
		}
		
		// If we are generating previews, then we need to sweep
		// no longer used tiles into the oldTileSet and update their
		// display metrics so that the new tiles can use them for
		// previews
		if (newTiles.length>0) {
			currentTileSet.sweep(oldTileSet, function(tile) {
				setTileBounds(mapState, tile, pixelRatio);
			});
		}
		
		// newTileRecords now contains all records that have been newly allocated.
		// We initialize them here in this ass-backwards way because we want to sort
		// them by proximity to the center but don't have the display information until
		// after we've iterated over all of them.  Think of this as the "initialize new
		// tiles" loop
		sortTiles(newTiles, pixelRatio * mapState.w/2, pixelRatio * mapState.h/2);
		for (i=0; i<newTiles.length; i++) {
			tile=newTiles[i];
			
			// Order is important here.  The tile may have a drawable
			// set within the call to loadTile, in which case don't do
			// the work to generate a preview
			if (!tile.loading && !tile.temporary) {
				tile.loading=true;
				this.sel.loadTile(tile);
			}
			if (!tile.drawable) {
				tile.generatePreview(oldTileSet);
			}
			tile.attach(element);
		}
		
		currentTileSet.sweep();
		oldTileSet.sweep();
		if (!lockedState) transitionTileSet.clear();
	}
	
};

/**
 * Sort tiles based on their center coordinate's proximity to
 * some reference coordinate.  The idea is that we are trying to
 * load tiles near the center before tiles on the edges.
 */
function sortTiles(tilesAry, x, y) {
	tilesAry.sort(function(tile1, tile2) {
		var score1=Math.abs(tile1.left+tile1.width/2 - x) + Math.abs(tile1.top+tile1.height/2 - y),
			score2=Math.abs(tile2.left+tile2.width/2 - x) + Math.abs(tile2.top+tile2.height/2 - y);
		return score1 - score2;
	});
}

/**
 * Given a MapState and TileKey, fill in a Rect with the pixel coordinates
 * of the tile for the current state.
 * This assumes rectangular display.  For rotation, this will all need to
 * be reworked.
 * @param mapState
 * @param tile
 */
function setTileBounds(mapState, tile, pixelRatio) {
	var size=tile.sel.tileSize,
		tileKey=tile.tileKey,
		scaledSize=pixelRatio * Math.ceil(size * tileKey.res / mapState.res),
		left=pixelRatio * Math.floor(mapState.prjToDspX(tileKey.scaledX * tileKey.res) - mapState.x),
		top=pixelRatio * Math.floor(mapState.prjToDspY(tileKey.scaledY * tileKey.res) - mapState.y);
		
	tile.setBounds(left, top, scaledSize, scaledSize);
}

/**
 * Class representing a tile selector for the layout of OSM, MS, Google, et al.
 * <p>
 * Typically, all that will need to be specified is options.tileSrc.  This string
 * will be interpolated relative to the tile information with the following
 * substitutions made:
 * <ul>
 * <li>${level} - Native level of the tile
 * <li>${tileX} - X coordinate of the tile
 * <li>${tileY} - Y coordinate of the tile
 * <li>${modulo:a,b} - Select one of the values in the list (in this case 'a' and 'b')
 *     based on a stable modulus based on the tile coordinate system.  Used to
 *     pick a domain name for a given tile.
 * <li>${quadkey} - Microsoft quadkey representation of tile index
 * </ul>
 * <p>
 * Remember to always provide proper attribution and get permission for using tiles.
 * <p>
 * The following tileSrc can be used to display tiles from different providers:
 * <ul>
 * <li>OSM (MapQuest): 
 * 		"http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png"
 * <li>OSM (Mapnik from openstreetmap.org): "http://${modulo:a,b,c}.tile.openstreetmap.org/${level}/${tileX}/${tileY}.png"
 * </ul>
 *
 * @class
 * @name nanomaps.CartesianTileSelector
 * @param {integer} [options.tileSize=256]
 * @param {string} [options.tileSrc='']
 */
function CartesianTileSelector(options) {
	options=options||{};
	// set defaults
	this.tileSize=options.tileSize||256;
	this.srcSpec=options.tileSrc||'';
	
	// Pending tile records, keyed by tile.tileKey.id:
	// {
	//		tile: the owning tile
	//		src: image source
	// 		img: DOM image element
	//		loaded: true|false
	//		time: utc millis on load, load ms on finish
	// }
	this.pending={};
}
CartesianTileSelector.prototype={
	toString: function() {
		return this.srcSpec;
	},
	
	_sched: function(pended) {
		var self=this, 
			id=pended.tile.tileKey.id,
			img=pended.img;
		img.onload=function() {
			pended.loaded=true;
			finish();
			
			if (pended.tile) {
				pended.tile.update(img);
			}
		};
		img.onerror=function() {
			finish();
		};
		
		function finish() {
			pended.time=now()-pended.time;
			delete self.pending[id];
			//console.log('Tile loaded(' + pended.tile.tileKey.id + ') in ' + pended.time + 'ms: ' + pended.src); 
		}
		
		// And away we go
		self.pending[id]=pended;
		img.src=pended.src;
	},
	
	loadTile: function(tile) {
		var pended={
			tile: tile,
			src: this.resolveSrc(tile.tileKey),// + '?' + now(),
			img: document.createElement('img'),
			loaded: false,
			time: now()
		};
		
		//console.log('Load tile ' + tile.tileKey.level + '@' + tile.tileKey.tileX + ',' + tile.tileKey.tileY);
		this._sched(pended);
	},

	destroyTile: function(tile) {
		var id=tile.tileKey.id;
		var pended=this.pending[id];
		if (pended && pended.tile===tile) {
			//console.log('Destroy tile ' + id);
			delete this.pending[id];
			// This is rumoured to cancel loading the
			// image in some browsers
			pended.img.src='data:image/png,';
		}
	},
	
	destroyDrawable: function(tile, drawable) {
		// TODO Not sure we need to do anything here
	},
	
	/**
	 * Get an img src from the tileDesc
	 * @public
	 * @name resolveSrc
	 * @methodOf nanomaps.TileSelector.prototype
	 * @param {TileKey} TileKey returned from select
	 */
	resolveSrc: function(tileKey) {
		var self=this;
		return self.srcSpec.replace(/\$\{([A-Za-z]+)(\:([^\}]*))?\}/g, function(s, name, ignore, args) {
			if (name==='quadkey') {
				return tileXYToQuadkey(tileKey.tileX, tileKey.tileY, tileKey.level);
			} else if (name==='modulo') {
				// get the args and modulo it by the tileDesc.tileX
				args=args.split(/\,/);
				return args[tileKey.tileX%args.length];
			} else if (name==='pixelRatio') {
				return self.pixelRatio || 1.0;
			} else {
				return tileKey[name];
			}
		});
	},
	
	/**
	 * Select all tiles that intersect the given bounding box at the
	 * given resolution.  Return an array of TileKey elements.  The coordinates
	 * define a bounding box in projected units (resolution invariant).
	 *
	 * @public
	 * @name select
	 * @methodOf nanomaps.CartesianTileSelector.prototype
	 * @param {Projection} projection map projection
	 * @param {Number} resolution resolution at which tiles will be rendered
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x2
	 * @param {Number} y2
	 * @return {Array[TileDesc]}
	 */
	select: function(projection, resolution, x1, y1, x2, y2) {
		// - Projection setup
		var tileSize=this.tileSize,
			projectedBounds=projection.PRJ_EXTENT,
			xinversion=projection.XINVERTED,
			yinversion=projection.YINVERTED,
			nativeLevel=Math.round(projection.toLevel(resolution)),
			nativeResolution=projection.fromLevel(nativeLevel),
			nativeOriginX,
			nativeOriginY;
			
		x1/=nativeResolution;
		y1/=nativeResolution;
		x2/=nativeResolution;
		y2/=nativeResolution;
		
		// Axis inversion madness - gotta love it
		if (yinversion) {
			// Common path
			nativeOriginY=projectedBounds.maxy / nativeResolution;
			y1=nativeOriginY - y1;
			y2=nativeOriginY - y2;
		} else {
			nativeOriginY=projectedBounds.miny / nativeResolution;
			y1=y1 - nativeOriginY;
			y2=y2 - nativeOriginY;
		}
		
		if (xinversion) {
			nativeOriginX=projectedBounds.maxx / nativeResolution;
			x1=nativeOriginX - x1;
			x2=nativeOriginX - x2;
		} else {
			// Common path
			nativeOriginX=projectedBounds.minx / nativeResolution;
			x1=x1 - nativeOriginX;
			x2=x2 - nativeOriginX;
		}
		
		// - Iteration
		var startX=Math.floor(Math.min(x1,x2)/tileSize),
			startY=Math.floor(Math.min(y1,y2)/tileSize),
			endX=Math.floor(Math.max(x1,x2)/tileSize),
			endY=Math.floor(Math.max(y2,y2)/tileSize),
			i, j,
			projectedX, projectedY,
			ret=[];
	
		for (j=startY; j<=endY; j++) {
			if (yinversion) {
				// Common path
				projectedY=nativeOriginY - j*tileSize;
			} else {
				projectedY=nativeOriginY + j*tileSize;
			}
				
			for (i=startX; i<=endX; i++) {
				if (xinversion) {
					projectedX=nativeOriginX - i*tileSize;
				} else {
					// Common path
					projectedX=nativeOriginX + i*tileSize;
				}
				
				ret.push(new CartesianTileKey(
					nativeLevel,
					i,
					j,
					nativeResolution,
					projectedX,
					projectedY,
					tileSize
				));
			}
		}
		
		return ret;
	}
};

/**
 * Uniquely identified a tile from a given TileSelector and contains
 * discreet vital fields needed to make rendering decisions about a tile.
 * Upon construction, the id field is computed as a string from the
 * tuple (level,tileX,tileY) and can be used as an object key.
 * <p>
 * The fields level,tileX,tileY uniquely identitfy the tile.  The
 * fields res, scaledX, scaledY, size are used to make rendering
 * decisions.
 * <p>
 * The choice of using scaledX,scaledY instead of raw units was not
 * necessarily a good one.  It potentially saves one multiple/divide
 * on render, but introduces complexity.  It is retained in this port
 * for consistency.
 */
function CartesianTileKey(level, tileX, tileY, res, scaledX, scaledY, size) {
	this.id=tileX+','+tileY+'@'+level;
	this.level=level;
	this.tileX=tileX;
	this.tileY=tileY;
	this.res=res;
	this.scaledX=scaledX;
	this.scaledY=scaledY;
	this.size=size;
}

/**
 * A renderable tile, identified by tileKey.  In the JavaScript/HTML port,
 * the "drawable" is always an HTML element (in android, it is a Drawable).
 * Note that it is not necessarily an img.  It may be a composite such as
 * a canvas or a div in cases where a preview is generated from multiple
 * bits of source material.
 */
function Tile(sel, tileKey) {
	this.sel=sel;
	this.tileKey=tileKey;
	this.drawable=null;
	this.parent=null;
	this.left=null;
	this.top=null;
	this.width=null;
	this.height=null;
	this.mark=false;
	this.temporary=false;
	this.loading=false;
}
Tile.prototype={
	_commitBounds: function(drawable) {
		/*
		if (this.width!==this.tileKey.size || this.height!==this.tileKey.size) {
			console.log('TileSize round error: (' + this.left + ',' + this.top + ') -> (' + this.width + ',' + this.height + ')');
		}
		*/
		
		drawable.style.position='absolute';
		drawable.style.left=this.left+'px';
		drawable.style.top=this.top+'px';
		drawable.style.width=this.width+'px';
		drawable.style.height=this.height+'px';
	},
	
	/**
	 * Sets a new drawable.  If the tile is rendered, then
	 * it will be directly updated in the display hierarchy.
	 */
	update: function(drawable) {
		var orig=this.drawable;
		this.drawable=drawable;
		drawable.setAttribute('tileid', this.tileKey.id);
		
		// If we're not rendered, just set it
		if (this.parent) {
			// Otherwise, do some gyrations
			this._commitBounds(drawable);
			if (orig) {
				this.parent.replaceChild(drawable, orig);
			} else {
				this.parent.appendChild(drawable);
			}
		}
		
		// Get rid of old
		if (orig) {
			this.sel.destroyDrawable(this, orig);
		}
	},
	
	setBounds: function(left, top, width, height) {
		var drawable=this.drawable;
		this.left=parseInt(left);
		this.top=parseInt(top);
		this.width=parseInt(width);
		this.height=parseInt(height);
		if (drawable) this._commitBounds(drawable);
	},
	
	/**
	 * Attach the tile to the display
	 */
	attach: function(parent) {
		var drawable=this.drawable;
		
		if (this.parent && parent!==this.parent) {
			// Reparent (doesn't happen but being complete)
			this.detach();
		}
		this.parent=parent;
		
		if (drawable) {
			this._commitBounds(drawable);
			if (!drawable.parentNode) parent.appendChild(drawable);
		}
	},
	
	/**
	 * Remove a tile from the view
	 */
	detach: function() {
		var drawable=this.drawable;
		this.parent=null;
		if (drawable&&drawable.parentNode) {
			drawable.parentNode.removeChild(drawable);
		}
	},
	
	dispose: function() {
		this.detach();
		if (this.drawable) {
			this.sel.destroyDrawable(this, this.drawable);
			this.drawable=null;
		}
		this.sel.destroyTile(this);
	},
	
	/**
	 * Generate a preview Drawable for this tile from material in the
	 * source TileSet.  This assumes that this tile's bounds are updated
	 * to current display bounds and all tiles in the tileSet are also
	 * updated.  If a preview could be generated it's drawable will be
	 * set
	 */
	generatePreview: function(tileSet) {
		var self=this,
			preview=null;
		
		tileSet.intersect(self, function(srcTile) {
			if (!preview) {
				try {
					preview=new TileCompositor(self);
				} catch (e) {
					// Will throw an exception if the browser
					// doesn't support canvas.  Oh well.
					// Uncomment to see reall error.
				}
			}
			
			if (preview) preview.add(srcTile);
		});
		
		if (preview) {
			self.update(preview.drawable);
		}
	}
};

function TileCompositor(tile) {
	var canvas=document.createElement('canvas'),
		ctx;
	canvas.width=tile.width;
	canvas.height=tile.height;
	ctx=canvas.getContext('2d');
	
	// Uncomment to see the drawn boxes
	//ctx.fillStyle='rgb(200,0,0)';
	//ctx.fillRect(2,2,canvas.width-2,canvas.height-2);
	
	// - exports
	this.drawable=canvas;
	this.add=function(blitTile) {
		var dx=blitTile.left-tile.left, dy=blitTile.top-tile.top,
			sx=0, sy=0,
			sw, sh,
			overflow,
			w=blitTile.width,
			h=blitTile.height,
			blitScaleX=blitTile.tileKey.size / blitTile.width, 
			blitScaleY=blitTile.tileKey.size / blitTile.height;
		
		if (dx<0) {
			// Clip left
			sx=-dx;
			dx=0;
			w-=sx;
		}
		if (dy<0) {
			// Clip top
			sy=-dy;
			dy=0;
			h-=sy;
		}
		
		// Clip right
		overflow=dx+w-tile.width;
		if (overflow>=0) {
			w-=overflow;
		}
		
		// Clip bottom
		overflow=dy+h-tile.height;
		if (overflow>=0) {
			h-=overflow;
		}
		
		// Source coordinates have been figured according to the current display
		// but the drawImage call works on original image dimensions.
		// Therefore, scale the source coordinates
		sx*=blitScaleX;
		sy*=blitScaleY;
		sw=w*blitScaleX;
		sh=h*blitScaleY;
		
		//console.log('drawImage(' + sx + ',' + sy + ',' + sw + ',' + sh + ',' + dx + ',' + dy + ',' + w + ',' + h + ')');
		try {
			ctx.drawImage(blitTile.drawable,
				sx, sy,
				sw, sh,
				dx, dy,
				w, h);
		} catch (e) {
			// There are boundary conditions due to rounding where
			// some coordinates may be out of bounds.  These will be
			// for tiles just outside of the bounds and we're just
			// going to let the system catch it and not lose any
			// sleep about it
			//console.log('Exception in call to drawImage(' + sx + ',' + sy + ',' + sw + ',' + sh + ',' + dx + ',' + dy + ',' + w + ',' + h + ')');
		}
	};
}

/**
 * Maintains a set of Tile instances that are locked in some way.
 * The rendering process typically consists of visiting tiles in a set,
 * marking as it goes and then sweeping unmarked tiles.
 */
function TileSet() {
	/**
	 * Content object keyed by TileKey.id with values of Tile
	 */
	this._c={};
}
TileSet.prototype={
	each: function(callback) {
		var c=this._c, k;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				callback(c[k]);
			}
		}
	},
	
	/**
	 * Reset all marks on contained tiles to false
	 */
	resetMarks: function() {
		this.each(function(tile) {
			tile.mark=false;
		});
	},
	
	get: function(tileKey) {
		return this._c[tileKey.id];
	},
	
	add: function(tile) {
		var id=tile.tileKey.id, c=this._c;
		var existing=c[id];
		if (existing) {
			existing.dispose();
		}
		c[id]=tile;
	},
	
	move: function(tileKey, destTileSet) {
		var id=tileKey.id, c=this._c,
			existing=c[id];
		if (existing) {
			delete c[id];
			destTileSet.add(existing);
		}
		return existing;
	},
	
	/**
	 * Sweep unmarked tiles into the targetTileSet,
	 * optionally invoking tileCallback(tile) for each
	 * tile transferred
	 */
	sweep: function(targetTileSet, tileCallback) {
		var c=this._c, ary=[], k, tile;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				if (!tile.mark) {
					if (targetTileSet) {
						targetTileSet.add(tile);
					} else {
						tile.dispose();
					}
					if (tileCallback) tileCallback(tile);
					ary.push(k);
				}
			}
		}
		
		for (k=0; k<ary.length; k++) {
			delete c[ary[k]];
		}
	},
	
	/**
	 * Dispose of all tiles and clear
	 */
	clear: function() {
		var c=this._c, ary=[], k, tile;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				tile.dispose();
			}
		}
		this._c={};
	},
	
	/**
	 * Select all tiles whose bounds intersect the bounds of the
	 * given tile and have a drawable.
	 */
	intersect: function(srcTile, callback) {
		var c=this._c, k, tile,
			minx=srcTile.left, miny=srcTile.top,
			maxx=minx+srcTile.width, maxy=miny+srcTile.height;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				if (tile.drawable && !(
						tile.left>=maxx ||
						(tile.left+tile.width)<minx ||
						tile.top>=maxy ||
						(tile.top+tile.height)<miny
					))
				{
					// Intersects
					callback(tile);
				}
			}			
		}
	}
};

// Exports
nanomaps.CartesianTileSelector=CartesianTileSelector;
nanomaps.TileLayer=TileLayer;

/**
 * nanomaps.motion.js
 * Motion events (click and touch) on a MapSurface
 */
/**
 * Class that can handle motion events on a map
 * @constructor
 * @name nanomaps.MotionController
 * @private
 */
var STATE_DOWN=0,
	STATE_DRAG=1,
	STATE_CLICK_PEND=2,
	CLICK_DOUBLE_MS=280,
	TOUCH_THRESHOLD=10,
	TOUCH_LONGTAP_MS=1000,
	TOUCH_DOUBLE_MS=280;

/**
 * MotionEvent instances are passed to handler functions
 * and summarize touch or click interactions that are subject
 * to default handling.
 *
 * @public
 * @constructor
 * @name nanomaps.MotionEvent
 */
function MotionEvent(type) {
	/**
	 * The type of motion event.  Different properties
	 * will be available based on the type.
	 * <ul>
	 * <li>'click': A gesture to be interpreted as a click has
	 * occurred.  The count field indicates how many consecutive clicks
	 * took place.
	 * <li>'drag': A single step in a drag gesture.  deltaX and deltaY
	 * describe magnitude of this change
	 * <li>'pinch': Single step of a pinch gesture.  This is a combined move
	 * and zoom and has fields deltaX, deltaY and deltaZoom
	 * <li>'longtap': A press and hold gesture has been detected.  If it is
	 * handled, it will stop default processing which will either allow
	 * panning/pinching or interpetation as a normal click/multi-click.
	 * </ul>
	 * @name type
	 * @memberOf nanomaps.MotionEvent#
	 */
	this.type=type;
	
	/**
	 * If the event has been handled by prior logic this flag
	 * should be set to true, in which case, default actions will not
	 * be performed.
	 * @name handled
	 * @memberOf nanomaps.MotionEvent#
	 */
	this.handled=false;
}

function MotionController(map) {
	function dispatch(motionEvent) {
		//console.log('dispatch motion event: ' + motionEvent.type + ': ' + motionEvent.count);
		map.dispatchMotionEvent(motionEvent);
	}
	
	// ---- Click Handling
	/**
	 * If a click is in progress, this will be an object
	 * {
	 * }
	 */
	var clickState,
		clickAttached;
	
	function clickAttach(attach) {
		var document=map.elements.document;
		if (attach && !clickAttached) {
			addEventListener(document, 'mouseup', clickHandleEvent);
			addEventListener(document, 'mousemove', clickHandleEvent);
			clickAttached=true;
		} else if (!attach && clickAttached) {
			removeEventListener(document, 'mouseup', clickHandleEvent);
			removeEventListener(document, 'mousemove', clickHandleEvent);
			clickAttached=false;
		}
	}
	
	function clickStart(event, coords) {
		clickCancel();
		clickState={
			b: event.button,
			s: STATE_DOWN,	// State
			cnt: 0,			// Click count
			cs: coords,		// Click start coords
			cl: coords,		// Click last coords
			t: 0,			// Click time
			ti: null		// Timer id
		};
	}
	
	function clickStartTimer() {
		setTimeout(function() {
			if (clickState && clickState.s===STATE_CLICK_PEND) {
				clickState.ti=null;
				clickDispatch();
				clickCancel();
			}
		}, CLICK_DOUBLE_MS);
	}
	
	function clickStopTimer() {
		if (clickState && clickState.ti) {
			clearTimeout(clickState.ti);
		}
	}
	
	function clickDispatch() {
		//console.log('clickDispatch: ' + clickState.cnt);
		var me=new MotionEvent('click');
		
		/**
		 * Button number that this click represents as defined
		 * by W3C mouse events.
		 * <ul>
		 * <li>0 = Left / Primary
		 * <li>1 = Middle
		 * <li>2 = Right
		 * </ul>
		 * @public
		 * @name button
		 * @memberOf nanomaps.MotionEvent#
		 */
		me.button=clickState.b;
		
		/**
		 * For 'click' events, this is the number of consecutive
		 * clicks performed.  1 for single click, 2 for double click,
		 * 3 for lots of caffeine, etc.
		 * @public
		 * @name count
		 * @memberOf nanomaps.MotionEvent#
		 */
		me.count=clickState.cnt;
		
		/**
		 * Viewport x coordinate of the gesture.
		 * @public
		 * @name x
		 * @memberOf nanomaps.MotionEvent#
		 */
		me.x=clickState.cs.x;

		/**
		 * Viewport y coordinate of the gesture.
		 * @public
		 * @name y
		 * @memberOf nanomaps.MotionEvent#
		 */
		me.y=clickState.cs.y;
		
		dispatch(me);
	}
	
	function clickCancel() {
		clickStopTimer();
		clickState=null;
	}
	
	/**
	 * This is the target of all click events
	 * (mousedown, mouseup, mousemove, mousewheel)
	 */
	function clickHandleEvent(event) {
		// Filter out any events that
		// are not the first button.
		// We'll enable other clicks later but they are tricky-tricky
		// to get right.
		if (!isLeftClick(event)) return;
		//console.log('handleClickEvent: ' + event.type + ' button=' + event.button);
		
		// It's ours now
		stopEvent(event);
		
		var coords=map.eventToContainer(event),
			me;
		
		switch (event.type) {
		case 'mousemove':
			if (clickState.s===STATE_DOWN || clickState.s===STATE_DRAG) {
				clickState.s=STATE_DRAG;
				me=new MotionEvent('drag');
				me.button=clickState.b;
				me.x=coords.x;
				me.y=coords.y;
				
				if (!clickState.cl) clickState.cl=clickState.cs;
				/**
				 * For drag, change in x from the last anchor position.
				 * @public
				 * @name deltaX
				 * @memberOf nanomaps.MotionEvent#
				 */
				me.deltaX=clickState.cl.x - coords.x;

				/**
				 * For drag, change in y from the last anchor position.
				 * @public
				 * @name deltaY
				 * @memberOf nanomaps.MotionEvent#
				 */
				me.deltaY=clickState.cl.y - coords.y;
				clickState.cl=coords;
				
				dispatch(me);
			}
			break;

		case 'mousedown':
			if (clickState && clickState.s===STATE_CLICK_PEND) {
				if ((now()-clickState.t)>CLICK_DOUBLE_MS) {
					// Not a valid followon click
					// Dispatch current and reset
					clickDispatch();
					clickStart(event, coords);
				} else {
					// Just let it resume the click sequence
					clickState.s=STATE_DOWN;
					clickStopTimer();
				}
			} else {
				clickStart(event, coords);
			}
			clickAttach(true);
			break;
			
		case 'mouseup':
			clickAttach(false);
			clickState.cnt++;
			if (clickState.s===STATE_DOWN) {
				// Start the double click timer
				clickState.s=STATE_CLICK_PEND;
				clickState.t=now();
				clickStartTimer();
			} else {
				clickCancel();
			}
			break;
			
		}
	}
	
	/**
	 * Handle mouse wheel events
	 * This is still shaky.  I think we need an interval timer
	 * and accumulator to straighten it out.  I also need a real
	 * scroll wheel mouse.
	 */
	function wheelHandleEvent(event) {
		stopEvent(event);
		clickCancel();
		clickAttach(false);
		
		var delta, factor=10.0,
			coords=map.eventToContainer(event), 
			me=new MotionEvent('scroll');
		if (event.wheelDelta) delta=event.wheelDelta/120;	// IE
		else if (event.delta) delta=-event.delta/3;
		else delta=-event.detail/3;
		
		// Wheel deltas can get pretty crazy.  Clamp them
		delta/=factor;
		if (delta>2.0) delta=2.0;
		else if (delta<-2.0) delta=-2.0;
		
		me.x=coords.x;
		me.y=coords.y;
		
		/**
		 * For 'scroll' events, this is the approximated zoom
		 * level change based on the magnitude of the scroll.
		 * @public
		 * @memberOf nanomaps.MotionEvent#
		 * @name deltaZoom
		 */
		me.deltaZoom=delta/factor;
		
		dispatch(me);
	}
	
	// -- Touch handling
	var touchState;
	
	function touchStartClickTimer() {
		touchStopTimer();
		touchState.ti=setTimeout(function() {
			touchState.ti=null;
			touchDispatchTap();
			touchCancel();
		}, TOUCH_DOUBLE_MS);
	}
	
	function touchStartLongTapTimer() {
		touchStopTimer();
		touchState.ti=setTimeout(function() {
			if (!touchState || touchState.s!==STATE_DOWN || touchState.t.length!==1) return;
			// Dispatch a longtap event and consume this tap if handled
			var me=new MotionEvent('longtap');
			me.button=0;
			me.x=touchState.t[0].x;
			me.y=touchState.t[0].y;
			me.count=1;
			dispatch(me);
			
			if (me.handled) {
				touchCancel();
			}
		}, TOUCH_LONGTAP_MS);
	}
	
	function touchStopTimer() {
		if (touchState) {
			if (touchState.ti) clearTimeout(touchState.ti);
			touchState.ti=null;
		}
	}
	
	function touchCancel() {
		touchStopTimer();
		touchState=null;
	}
	
	function touchDispatchTap() {
		var me=new MotionEvent('click');
		me.button=0;
		me.count=touchState.cnt;
		me.x=touchState.tapX;
		me.y=touchState.tapY;
		
		//console.log('tap: count=' + me.count + ', xy=(' + me.x + ',' + me.y + ')');
		dispatch(me);
	}
	
	
	function touchTranslate(eventTouches) {
		var touches=[];
		if (eventTouches) { 
			for (i=0; i<eventTouches.length; i++) {
				touch=eventTouches[i];
				touches.push(map.eventToContainer(touch));
			}
		}
		return touches;
	}
	
	function touchMoveSingle(currentXY, prevXY) {
		//console.log('touchMoveSingle (' + prevXY.x + ',' + prevXY.y + ') -> (' + currentXY.x + ',' + currentXY.y + ')');
		var me=new MotionEvent('drag');
		me.button=0;
		
		me.x=currentXY.x;
		me.y=currentXY.y;
		me.deltaX=prevXY.x - currentXY.x;
		me.deltaY=prevXY.y - currentXY.y;
		
		dispatch(me);
	}
	
	function touchMoveMulti(currentXY1, currentXY2, prevXY1, prevXY2) {
		//console.log('touchMoveMulti [(' + prevXY1.x + ',' + prevXY1.y + '),(' + prevXY2.x + ',' + prevXY2.y + ')] -> [(' + currentXY1.x + ',' + currentXY1.y + '),(' + currentXY2.x + ',' + currentXY2.y + ')]');
		
		var me=new MotionEvent('pinch'),
			ccX=(currentXY1.x+currentXY2.x)/2,
			ccY=(currentXY1.y+currentXY2.y)/2,
			pcX=(prevXY1.x+prevXY2.x)/2,
			pcY=(prevXY1.y+prevXY2.y)/2,
			cdx=currentXY1.x-currentXY2.x,
			cdy=currentXY1.y-currentXY2.y,
			pdx=prevXY1.x-prevXY2.x,
			pdy=prevXY1.y-prevXY2.y,
			cmag=Math.sqrt(cdx*cdx+cdy*cdy),
			pmag=Math.sqrt(pdx*pdx+pdy*pdy);
		
		me.button=0;
		me.x=ccX;
		me.y=ccY;
		me.deltaX=pcX-ccX;
		me.deltaY=pcY-ccY;
		
		/**
		 * For pinch, this is the change in zoom level that should be
		 * applied around the centroid (x,y) in addition to any movement
		 * by (deltaX, deltaY)
		 * @public
		 * @name deltaZoom
		 * @memberOf nanomaps.MotionEvent#
		 */
		me.deltaZoom=Math.log(cmag/pmag) * 1.5;
		
		//console.log('pinch: deltaXY=(' + me.deltaX + ',' + me.deltaY + '), deltaZoom=' + me.deltaZoom);
		dispatch(me);
	}
	
	function touchHandleEvent(event) {
		var type=event.type,
			currentTouches;
			
		stopEvent(event);
		
		// Extract current touches and translate to local coordinates
		currentTouches=touchTranslate(event.touches);
		
		//console.log('ontouch: ' + event.type + ', touches=' + currentTouches.length);
		
		// Handle touch start
		if (type==='touchstart') {
			// Handle followon tap
			if (touchState && touchState.s===STATE_CLICK_PEND) {
				if ((now()-touchState.te)>TOUCH_DOUBLE_MS) {
					// Not a valid followon tap
					// Dispatch current and reset
					touchDispatch();
					touchCancel();
					
					// Fall through to normal touch start
				} else if (currentTouches.length===1) {
					// Just let it resume the tap-tap sequence
					touchState.s=STATE_DOWN;
					touchState.t=currentTouches;
					touchStopTimer();
					return;
				}
			}
			
			// Normal touch initiation when a new finger is pressed
			if (!touchState) {
				touchState={
					s: STATE_DOWN,
					t: currentTouches,	// Touches array
					mt: false,			// True if multi-touch
					te: 0,				// Last touch end time
					ts: now(),			// Current touch start time
					ti: null,			// Touch timer id
					cnt: 0				// Number of consecutive touches
				};
				touchStartLongTapTimer();
			} else {
				if (currentTouches.length>1) touchState.mt=true;
				touchState.t=currentTouches;
			}
			return;
		} 
		
		// Don't do anything else if not in a touch state
		if (!touchState) return;
		
		switch (event.type) {
		case 'touchmove':
			if (currentTouches.length===1) {
				if (touchState.s===STATE_DRAG ||
					Math.abs(currentTouches[0].x-touchState.t[0].x)>TOUCH_THRESHOLD ||
					Math.abs(currentTouches[0].y-touchState.t[0].y)>TOUCH_THRESHOLD)
				{
					// Cancel any longtap in progress
					touchStopTimer();
					
					// Single touch over touch threshold
					if (touchState.s===STATE_CLICK_PEND) {
						// Dispatch pending and reset
						touchDispatch();
						touchState.cnt=0;
					}
					
					touchState.s=STATE_DRAG;
					touchMoveSingle(currentTouches[0], touchState.t[0]);
					touchState.t=currentTouches;
				}
			} else if (currentTouches.length>1) {
				touchState.s=STATE_DRAG;
				touchMoveMulti(
					currentTouches[0],
					currentTouches[1],
					touchState.t[0],
					touchState.t[1]
				);
				touchState.t=currentTouches;
			}
			
			break;
		case 'touchend':
			// Note that ios calls touchend with 0 touches
			// when done, but android calls it with its 1 touch
			// still present (at least on single touch devices).
			// This is a pita since we don't have a clear signal
			// of completion.
			// This may not work on android multi-touch.
			if (!touchState.mt || currentTouches.length===0) {
				// All done here
				if (touchState.s===STATE_DOWN) {
					touchState.cnt++;
					touchState.s=STATE_CLICK_PEND;
					touchState.tapX=touchState.t[0].x;
					touchState.tapY=touchState.t[0].y;
					touchState.te=now();
					touchStartClickTimer();
				} else {
					touchCancel();
				}
			} else {
				touchState.t=currentTouches;
			}
			break;
		case 'touchcancel':
			touchCancel();
			break;
		}
	}
	
	/**
	 * Listen to all motion related events on
	 * the map.
	 *
	 * @methodOf Nanomaps.MotionController#
	 */
	this.listen=function(enableClick, enableTouch, enableWheel) {
		var elements=map.elements,
			target=elements.event,
			parent=elements.parent,
			touchEvents=[
				'touchstart',
				'touchend',
				'touchmove',
				'touchcancel'
			],
			i;
		
		if (enableClick) {
			// Just listen for mousedown to start with
			// We will listen for mousemove and mouseup
			// on document when we enter a down state
			addEventListener(target, 'mousedown', clickHandleEvent);
			
			// Also listen on the parent so that we get mousedowns
			// that bubble up the hierarchy from inactive elements
			// ** Actually not doing this as it completely breaks containment
			//addEventListener(parent, 'mousedown', clickHandleEvent);
		}
		
		if (enableWheel) {
			addEventListener(target, 'DOMMouseScroll', wheelHandleEvent);
			addEventListener(target, 'mousewheel', wheelHandleEvent);
		}
		
		if (enableTouch && target.addEventListener) {
			for (i=0; i<touchEvents.length; i++) {
				target.addEventListener(touchEvents[i], touchHandleEvent, true);
			}
		}
	};
}

MapSurfaceMethods.advise('initialize', 'after', function(options) {
	var motionController=new MotionController(this);
	
	/**
	 * Controller for motion related events (touch, click)
	 * @public
	 * @memberOf nanomaps.MapSurface#
	 */
	this.motionController=motionController;
	
	motionController.listen(
		!options.noClick,
		!options.noTouch,
		!options.noWheel
		);
		
	// TODO: This is temp.  Going to do a CSS approach later.
	//this.elements.event.style.cursor='move';
});

/**
 * Dispatch a MotionEvent for processing.  This will emit
 * the 'motion' event on the map and then call handleMotionEvent
 * for default processing if the handled flag is false.
 * @public
 * @name dispatchMotionEvent
 * @methodOf nanomaps.MapSurface.prototype
 * @param motionEvent {nanomaps.MotionEvent}
 */
MapSurfaceMethods.dispatchMotionEvent=function(motionEvent) {
	var eventName='motion.' + motionEvent.type;
	//console.log('emit(' + eventName + ')');
	this.emit(eventName, motionEvent);
	if (!motionEvent.handled) {
		this.handleMotionEvent(motionEvent);
	}
};

/**
 * Perform default processing of a MotionEvent if its handled
 * property is false after dispatch.  You can intercept motion
 * events by registering an event with name 'motion.{type}'.
 * <pre>
 * 	map.on('motion.click', function(motionEvent) {
 * 		alert('Clicked at ' + motionEvent.x + ',' + motionEvent.y);
 * 		motionEvent.handled=true;
 * 	});
 * </pre>
 * @public
 * @name handleMotionEvent
 * @methodOf nanomaps.MapSurface.prototype
 * @param motionEvent {nanomaps.MotionEvent}
 */
MapSurfaceMethods.handleMotionEvent=function(motionEvent) {
	if (motionEvent.handled) return;
	
	var type=motionEvent.type, deltaZoom;
	if (type==='drag' || type==='pinch') {
		this.begin();
		this.moveBy(motionEvent.deltaX, -motionEvent.deltaY);
		deltaZoom=Number(motionEvent.deltaZoom);
		if (!isNaN(deltaZoom)) {
			this.setZoom(this.getZoom() + deltaZoom, motionEvent.x, motionEvent.y);
		}
		this.commit();
		motionEvent.handled=true;
	} else if (type==='scroll') {
		this.setZoom(this.getZoom()+motionEvent.deltaZoom, 
			motionEvent.x, motionEvent.y);
		motionEvent.handled=true;
	} else if (type==='click' && motionEvent.count===2) {
		// Double-click to zoom
		this.begin();
		this.zoomIn(motionEvent.x, motionEvent.y);
		this.commit(true);
		motionEvent.handled=true;
	}
};


/**
 * nanomaps.imgmarker.js
 * Factories for constructing HTML fragments suitable to be used
 * as markers from stock imagery
 */
function makeAbsolute(baseUri, href) {
	if (href[0]==='/' || href.search(/^http(s)?\:/)>=0) return href;
	if (baseUri.match(/\/$/)) return baseUri+href;
	else return baseUri+'/'+href;
}

function hrefToClassSuffix(href) {
	var i=href.lastIndexOf('/'),
		baseName=(i>=0 ? href.substring(i+1) : href),
		m=baseName.match(/^([^_\-\.]+)/);
	return m ? m[0] : href;
}

/**
 * Primordial image marker class.  Image markers are managed according
 * to the prototype pattern.  If you have one, you can customize it into
 * a new one.  Any marker instance can be used in a call to MapSurface.attach
 * due to it fulfilling the element factory interface.
 * @public
 */
function ImgMarker(settings) {
	this.settings=new SettingsConstructor(settings);
	this.element=null;
	this.children=null;
}
/**
 * Global settings inherited for each instance
 */
ImgMarker.Settings={
	/**
	 * The img src.  If primarySuffix is not specified,
	 * then the first alpha-numeric part of this string
	 * is taken.
	 */
	src: 'orb_blue.png',
	
	/**
	 * The uri to resolve relative sources against
	 */
	baseUri: '',
	
	/**
	 * Location Coordinate
	 */
	location: null,
	
	/**
	 * If set, then this is the primary css suffix.  If not set,
	 * it is derived from the src.
	 */
	 classSuffix: '',
	 
	 /**
	  * Extra css classes
	  */
	 extraClasses: ''
};

ImgMarker.prototype={
	/**
	 * By default ImgMarker instances are attached to the 'overlay' layer
	 * @public
	 * @name defaultLayer
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	defaultLayer: 'overlay',

	/**
	 * Update the latitude/longitude settings.  If the marker is attached,
	 * make the updates live on the map as well.
	 * @methodOf nanomaps.ImgMarker.prototype
	 * @name setLocation
	 * @param coordinate {Coordinate}
	 */
	setLocation: function(coordinate) {
		coordinate=Coordinate.from(coordinate);
		var settings=this.settings,
			element=this.element,
			owner=this.owner;
		settings.location=coordinate;
		if (element) {
			if (coordinate) {
				element.geo={
					latitude: coordinate.lat(),
					longitude: coordinate.lng()
				};
			} else {
				element.geo=null;
			}
			if (owner&&element.parentNode) {
				owner.update(element);
			}
		}
	},
	
	/**
	 * (Attachment Api) Get the element that should be attached
	 * to the map.
	 * <pre>
	 * <div class="nmim">
	 *   <img src="{src url}" class="nmim-fg {src class}"/>
	 * </div>
	 * </pre>
	 * A background will only be specified if setup in the properties.  In addition,
	 * the actual dom element returned will have its "geo" object set so that
	 * the default map delegate can position it appropriately.
	 * @public
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	getElement: function(mapSurface) {
		this.owner=mapSurface;
		if (this.element) return this.element;
		var d=mapSurface.elements.document,
			element=d.createElement('div'),
			fgElt=d.createElement('img');
		element.appendChild(fgElt);
		
		// Export
		this.element=element;
		this.children={
			fg: fgElt
		};
		
		// Apply config
		this._config();
		return element;
	},
	
	/**
	 * Apply the current configuration to the elements
	 * @private
	 * @name _config
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	_config: function() {
		var settings=this.settings,
			location=settings.location,
			element=this.element,
			fgElt=this.children.fg,
			fgSrc,
			classSuffix;
			
			
		// Configure fg img elt
		fgSrc=makeAbsolute(settings.baseUri||'', settings.src||'');
		classSuffix=settings.classSuffix || hrefToClassSuffix(fgSrc);
		
		element.className='nmim nmim-' + classSuffix + ' ' + settings.extraClasses;
		if (location) {
			element.geo={
				latitude: location.lat()||NaN,
				longitude: location.lng()||NaN
			};
		} else {
			element.geo=null;
		}
		
		fgElt.className='nmim-fg';
		fgElt.setAttribute('src', fgSrc||null);
	}
};

/**
 * Used internally to create a new settings object with the global
 * settings as its prototype.
 * @private
 */
function SettingsConstructor(override) {
	if (override) {
		for (var k in override) {
			if (override.hasOwnProperty(k))
				this[k]=override[k];
		}
	}
}
SettingsConstructor.prototype=ImgMarker.Settings;


// Exports
exports.ImgMarker=ImgMarker;

/**
 * nanomaps.svgmarker.js
 * Add vector graphics markers to the map.  This source file
 * presumes the presence of svg.  If SVG is not present, the
 * various classes should not throw exceptions but will not
 * display anything.  It is expected that the patterns employed
 * here can be used to provide similar graphics for IE browsers
 * using VML, if anyone cares.
 * <p>
 * Unlike ImgMarker instances, which are factories, it is anticipated
 * that vector graphics are much less "prototypical" than standard
 * image markers.  They also require more state management since
 * they are not "simple" map attachments (ie. their display is inherently
 * resolution dependent).  As such, each marker in this package wraps
 * the physical elements that are attached to the map and can therefore
 * only be attached once.  Most manipulation of the elements is left
 * to user code acting on the DOM.  This library just takes care of
 * physical unit conversions.
 */
var svgns='http://www.w3.org/2000/svg';

function createSvgElement(tagName) {
	try {
		return document.createElementNS(svgns, tagName);
	} catch (e) {
		// Just provide a dummy standin
		var elt=document.createElement('svgdummy');
		if (!elt.style) elt.style={};
	}
}

/**
 * Base class SvgMarker.  Manages an svg canvas and defines the map delegate
 * needed to keep it updated.
 * @public
 * @constructor
 */
function SvgMarker(settings) {
	settings=this.settings=settings||{};
	var canvas=createSvgElement('svg');
	canvas.setAttribute('class', settings.className||'');
	canvas.mapeer=this;	// Circular ref ok.  The only browsers who support svg have decent gc
	this.canvas=canvas;	
}
SvgMarker.prototype={
	//// -- mapDelegate methods
	unmanaged: false,
	defaultLayer: 'shadow',
	
	getElement: function(mapSurface) {
		this.owner=mapSurface;
		return this.canvas;
	},
	
	/**
	 * Subclasses should override and must update the size/position
	 * of the canvas and contained elements.
	 */
	mareset: function(map, canvas) {
	},
	
	//// -- stub methods intended for subclassing
	
	//// -- regular instance methods
	
	/**
	 * Resets the element.  This typically happens automatically on map updates
	 * but may need to be triggered manually on property update.
	 * @public
	 */
	invalidate: function() {
		var owner=this.owner, canvas=this.canvas;
		if (owner && canvas.parentNode) 
			this.mareset(owner, canvas);
	}
};
inherits(SvgMarker, EventEmitter);

function EllipseMarker(settings) {
	SvgMarker.call(this, settings);
	var ellipse=createSvgElement('ellipse');
	this.canvas.appendChild(ellipse);
	this.ellipse=ellipse;
}
EllipseMarker.prototype={
	mareset: function(map, canvas) {
		var ellipse=this.ellipse,
			settings=this.settings,
			rx, ry,
			unit=settings.unit||'px',
			longitude=settings.longitude,
			latitude=settings.latitude,
			canvasWidth, canvasHeight,
			centerX, centerY,
			xy, x, y;

		// Either calculate rx/ry independently (true ellipse)
		// or just take the radius and fake it to create circles
		// visually.  Accurate for small areas and makes more sense
		// visibly
		if ('radius' in settings) {
			rx=ry=translateX(map, settings.radius||0, unit);
		} else {
			rx=translateX(map, settings.rx||0, unit);
			ry=translateY(map, settings.ry||0, unit);
		}
			
		canvasWidth=oddCeil(rx*2+20);
		canvasHeight=oddCeil(ry*2+20);
		
		centerX=Math.round(canvasWidth/2);
		centerY=Math.round(canvasHeight/2);
		
		ellipse.setAttribute('cx', centerX);
		ellipse.setAttribute('cy', centerY);
		ellipse.setAttribute('rx', rx);
		ellipse.setAttribute('ry', ry);
		
		//alert('rx=' + rx);
		
		xy=map.globalToXY(settings);
		if (xy) {
			x=xy.x()-centerX;
			y=xy.y()-centerY;
			canvas.style.left=x+'px';
			canvas.style.top=y+'px';
			canvas.style.width=canvasWidth+'px';
			canvas.style.height=canvasHeight+'px';
			canvas.style.display='block';
		} else {
			canvas.style.display='none';
		}
	}
};
inherits(EllipseMarker, SvgMarker);

//// -- utilities
function oddCeil(n) {
	n=Math.ceil(n);
	if ((n%2)!==1) n++;
	return n;
}

function translateX(map, distance, unit) {
	var res=map.mapState.res;
	switch (unit) {
	case 'px': return distance;
	case 'm':
		return distance/res;
	default:
		return 0;
	}
}

function translateY(map, distance, unit) {
	var res=map.mapState.res;
	switch (unit) {
	case 'px': return distance;
	case 'm':
		return distance/res;
	default:
		return 0;
	}
}

// exports
exports.SvgMarker=SvgMarker;
exports.EllipseMarker=EllipseMarker;



/**
 * nanomaps.infowindow.js
 * Basic infowindow library.
 */
 
/**
 * An InfoWindow is a map attachment that is anchored to a specific
 * place on the map, displays some custom content and typically has
 * some kind of visual pointer that physically points to the mapped
 * location.  In all other ways, it is just HTML with CSS styling
 * to provide the desired look and feel.  The InfoWindow class is provided
 * to ease the management of these windows according to typical usage
 * patterns by providing the following features (while otherwise
 * leaving you to bring your own html and css):
 * <ul>
 * <li>Create shell dom structure
 * <li>Position the window within the viewport
 * <li>Position the pointer within the window
 * <li>Support enumeration/manipulating of all open windows on the map
 * </ul>
 * 
 * <h3>Design</h3>
 * Most of the actual details of the InfoWindow are handled by a delegate
 * object passed in at construction time.  This will default to DefaultInfoWindowDelegate
 * if not specified.
 * 
 * <h3>Attribution</h3>
 * Inspiration for some of the default styling presented here was
 * derived from <a href="http://google-maps-utility-library-v3.googlecode.com/svn/trunk/infobubble/examples/example.html">google-maps-utility-library-v3</a>.
 * 
 * <h3>Default Styling</h3>
 * The following styling block works with the default infowindow settings
 * <pre>
 *	.nmiw {
 *		padding: 4px 15px 4px 15px;
 *		background: -webkit-gradient(linear,left top,left bottom,color-stop(0, #707070),color-stop(0.51, #5E5E5E),color-stop(0.52, #393939));
 *		background: -moz-linear-gradient(center top,#707070 0%,#5E5E5E 51%,#393939 52%);
 *	
 *		border-color: #2C2C2C;
 *		border-style: solid;
 *		border-width: 1px;
 *		border-top-left-radius: 4px 4px;
 *		border-top-right-radius: 4px 4px;
 *		border-bottom-right-radius: 4px 4px;
 *		border-bottom-left-radius: 4px 4px;
 *		opacity: 0.95;
 *	}
 *	
 *	.nmiw-content {
 *		font-family: Helvetica-Neue, Helvetica, arial, sans-serif;
 *		font-size: 18px;
 *		line-height: 25px;
 *		text-shadow: 0 -1px 0 black;	
 *		font-weight: bold;
 *		color: #fff;
 *	}
 *	
 *	.nmiw-pointer {
 *		position: absolute;
 *		bottom: -15px;
 *		width: 0px;
 *		height: 0px;
 *		margin-left: -16px;
 *		border-top: 15px solid #393939;
 *		border-left: 15px solid transparent;
 *		border-right: 15px solid transparent;
 *	}
 * </pre>
 * @constructor
 * @public
 * @name nanomaps.InfoWindow
 */
function InfoWindow(options) {
	if (!options) options={};
	this.options=options;
	
	// -- Instantiate the delegate
	var delegateCtor=options.delegate||InfoWindowDelegate,
		delegate,
		state,
		element;
	if (isFunction(delegateCtor)) 
		delegate=new delegateCtor(options);
	else
		delegate=delegateCtor;
	
	this.delegate=delegate;
	
	// -- Set up the state object
	element=this.element=delegate.init();
	
	// -- The peer is the delegate
	element.mapeer=delegate;
}

InfoWindow.prototype={
	// -- Attachment API
	defaultLayer: 'foreground',
	getElement: function(mapSurface) {
		var owner=this.owner;
		// Change owner
		this.owner=mapSurface;
		return this.element;
	},
	
	setLocation: function(coordinate, offset) {
		var element=this.element,
			owner=this.owner;
		element.macoord=coordinate && Coordinate.from(coordinate);
		element.maoffset=offset && Coordinate.from(offset);
		if (owner && element.parentNode) {
			// Force a reset
			owner.update(this);
		}
	},
	
	getContent: function() {
		return this.delegate.getContent(this.element);
	}
};

/**
 * Default InfoWindow delegate class.
 * @constructor
 * @public
 * @name nanomaps.InfoWindowDelegate
 */
function InfoWindowDelegate(options) {
	this.cssPrefix=options.cssPrefix||'nmiw';
	this.margin=options.margin || 25;
}
InfoWindowDelegate.prototype={
	init: function() {
		var cssPrefix=this.cssPrefix,
			element=div(),
			contentElement=div(),
			pointerElement=div();
			
		element.appendChild(contentElement);
		element.appendChild(pointerElement);
		
		element.style.position='absolute';
		pointerElement.style.position='absolute';
		
		element.className=cssPrefix;
		contentElement.className=cssPrefix + '-content';
		pointerElement.className=cssPrefix + '-pointer';
		
		// Add dom references to _outer so we can function
		// in a peer
		element._content=contentElement;
		element._pointer=pointerElement;
		
		return element;
	},
	
	mareset: function(mapSurface, element) {
		var xy=mapSurface.globalToXY(element.macoord),
			offsetXY=element.maoffset,
			left, top;
			
		if (xy) {
			left=xy.x();
			top=xy.y();
			if (offsetXY) {
				left-=offsetXY.x();
				top-=offsetXY.y();
			}
			element.style.left=left+'px';
			element.style.top=top+'px';
			element.style.display='block';
		} else {
			element.style.display='none';
		}
		if (!element._layedOut) {
			this.layout(mapSurface, element, false);
			element._layedOut=true;
		}
	},
	
	layout: function(mapSurface, element) {
		// Element (left,top) coordinates are relative to the offset
		// area (offsetWidth/offsetHeight).  In a normal configuration,
		// we expect the pointer coordinates to be relative to the client
		// area of the container, but this requires too much knowledge
		// of the specific visuals, so we instead require that the css
		// for the pointer rig it in such a way that the pointer left
		// is relative to its container left.  This will require balancing
		// content area padding/borders with negative margin on the pointer.
		// The pointer should also be pre-biased by the layout so that the
		// zero point refers to the correct center position.
		
		// First unset forced width so we can measure the natural size.
		// The make sure the width does not overflow our display area
		element.style.width='';
		var margin=this.margin,
			viewportWidth=mapSurface.mapState.w - 2*margin;
		if (element.offsetWidth>viewportWidth) {
			// Clamp the size to an allowable width
			element.style.width=(
				viewportWidth - element.offsetWidth + element.clientWidth
				) + 'px';
		}
		
		// Figure marginLeft setting needed to optimize display
		// First order of business is to measure
		// the element and determine the offsets in order
		// to position its bottom center at the origin
		var width=element.offsetWidth,
			pointer=element._pointer,
			offsetX=width/2,
			vpX=parseInt(element.style.left)+parseInt(element.parentNode.style.left)-offsetX,
			overflowX;
		
		// If we're viewport biasing, determine the element's anchor position
		// in viewport space
		overflowX=vpX-margin;
		if (overflowX<0) {
			//console.log('Overflow left: vpX=' + vpX + ', viewportWidth=' + viewportWidth + ', overflowX=' + overflowX);
			offsetX+=overflowX;
			//console.log('offsetX=' + offsetX);
		} else {
			overflowX=(vpX+width)-(viewportWidth-margin);
			if (overflowX>0) {
				//console.log('Overflow left: vpX=' + vpX + ', width=' + width + ', viewportWidth=' + viewportWidth + ', overflowX=' + overflowX);
				offsetX+=overflowX;
				//console.log('offsetX=' + offsetX);
			}
		}
		
		// Start violating the viewport margin if we don't have at least one pointer width
		// between the edge and the margin
		if (offsetX<pointer.offsetWidth) offsetX=pointer.offsetWidth;
		else if (offsetX>(width-pointer.offsetWidth)) offsetX=width-pointer.offsetWidth; 
		
		
		// Commit the coordinates
		pointer.style.left=(offsetX) + 'px';
		element.style.marginLeft=(-offsetX) + 'px';
		
		// And marginTop
		element.style.marginTop=(
			- element.offsetHeight - pointer.offsetHeight
			) + 'px';
	},
	
	getContent: function(element) {
		return element._content;
	}
};

// -- Exports
exports.InfoWindow=InfoWindow;
exports.InfoWindowDelegate=InfoWindowDelegate;

})(window);

