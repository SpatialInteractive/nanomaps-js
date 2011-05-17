/**
 * nanomaps.dom.js
 * Core dom utilities.  We don't depend on third-party libs so
 * port the boiler-plate idiocy here.
**/

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

