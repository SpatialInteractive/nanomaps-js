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

exports.EventEmitter=EventEmitter;

