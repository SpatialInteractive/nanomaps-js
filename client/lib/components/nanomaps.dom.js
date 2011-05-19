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

