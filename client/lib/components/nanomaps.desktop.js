/**
 * Extend MapSurface with standard support for desktop event handling:
 *  - mouse events
 *  - mouse cursors
 *  - translation of desktop events to gestures
 */
var DOUBLE_CLICK_TIME=100;

// State management
function updateMouseState(map, action, event) {
	var mouseState=map._mouseState, coords=map.eventToContainer(event),
		deltaX, deltaY;
		
	switch (action) {
	case 'down':
		// A down click resets everything
		clearMouseState(map);
		mouseState.s='down';
		mouseState.start=coords;
		if (!mouseState.ccount) mouseState.ccount=0;

		if (mouseState.clickTimer) {
			clearTimeout(mouseState.clickTimer);
			mouseState.clickTimer=null;
		}

		break;
		
	case 'up':
		if (mouseState.s=='down') {
			// Simulate a click
			mouseState.ccount+=1;
			if (mouseState.clickTimer) {
				clearTimeout(mouseState.clickTimer);
				mouseState.clickTimer=null;
			}
			
			if (mouseState.ccount>1) {
				// trigger double click
				//console.log('double click');
				mouseState.ccount=0;
				
				deltaY=Math.ceil(map.getZoom()+0.1);
				map.setZoom(deltaY, coords.x, coords.y);
			} else {
				mouseState.clickTimer=setTimeout(function() {
					mouseState.clickTimer=null;
					
					// single click
					//console.log('single click: lat=' + map.toLatLng(coords.x, coords.y).lat + ', lng=' + map.toLatLng(coords.x, coords.y).lng);
					mouseState.ccount=0;
				}, DOUBLE_CLICK_TIME);
			}
		} 
		// Just clear the state
		clearMouseState(map);
		break;
		
	case 'move':
		if (mouseState.s==='down'||mouseState.s==='drag') {
			mouseState.s='drag';
			if (!mouseState.last) mouseState.last=mouseState.start;
			deltaX=mouseState.last.x-coords.x;
			deltaY=mouseState.last.y-coords.y;
			mouseState.last=coords;
			
			map.moveBy(deltaX, -deltaY);
		}
		break;
	}
	
}
function clearMouseState(map) {
	var mouseState=map._mouseState;
	mouseState.s=null;
	mouseState.start=null;
	mouseState.last=null;
}


// Event handlers
MapSurfaceMethods.ondom_mousedown=function(event) {
	updateMouseState(this, 'down', event);
	event.preventDefault();
};
MapSurfaceMethods.ondom_mouseup=function(event) {
	if (!this._mouseState.s) return;	// Only process a move if in a state

	updateMouseState(this, 'up', event);
	event.preventDefault();
};
MapSurfaceMethods.ondom_mousemove=function(event) {
	if (!this._mouseState.s) return;	// Only process a move if in a state
	
	updateMouseState(this, 'move', event);
	event.preventDefault();
};
MapSurfaceMethods.ondom_mousewheel=function(event) {
	clearMouseState(this);
	event.preventDefault();
	
	// Handle scroll (TODO - this needs to zoom around the mouse point)
	var delta, factor=10, level=Math.round(this.getZoom()*factor)/factor,
		coords=this.eventToContainer(event);
	if (event.wheelDelta) delta=event.wheelDelta/120;	// IE
	else if (event.delta) delta=-event.delta/3;
	else delta=-event.detail/3;
	
	this.setZoom(level+delta/10.0, coords.x, coords.y);
};

// Attach to initialization
MapSurfaceMethods.advise('initialize', 'after', function(options) {
	this._mouseState={};
	this.routeDomEvent('mousedown', null, 'event');
	this.routeDomEvent('mouseup', null, 'document');
	this.routeDomEvent('mousemove', null, 'document');
	if (!options.disableMouseWheel) {
		this.routeDomEvent('DOMMouseScroll', 'dom_mousewheel', 'event');
		this.routeDomEvent('mousewheel', null, 'event');
	}
	this.elements.event.style.cursor='move';
});

