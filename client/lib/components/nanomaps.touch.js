/**
 * Extend MapSurface with standard support for desktop event handling:
 *  - mouse events
 *  - mouse cursors
 *  - translation of desktop events to gestures
 */

/**
 * Return true if the device may be touch enabled.  This does not actually
 * detect if touch is absolutely supported but filters out legacy browsers
 * that won't even run the code.
 */
function touchEligible() {
	return !!document.addEventListener;
}

function getTouchState(map) {
	return map._touchState;
}

function recordTouches(map, touchState, event) {
	var i, touch, touches=event.touches, dest=[];
	for (i=0; i<touches.length; i++) {
		touch=touches[i];
		dest.push(map.eventToContainer(touch));
	}
	
	touchState.t=dest;
}

function clearTouchState(touchState) {
	touchState.s='';
	touchState.l=null;
	touchState.c=null;
	touchState.z=null;
	if (touchState.iid) {
		clearInterval(touchState.iid);
		touchState.iid=null;
	}
	if (touchState.tkey) {
		clearTimeout(touchState.tkey);
		touchState.tkey=null;
	}
}

function calculateCenter(touchState) {
	var i, x=0, y=0;
	for (i=0; i<touchState.t.length; i++) {
		x+=touchState.t[i].x;
		y+=touchState.t[i].y;
	}
	x/=i;
	y/=i;
	
	return {x:x,y:y};
}

function clampMove(delta) {
	var absDelta=Math.abs(delta), sign=delta/absDelta, limit=100;
	if (absDelta>250 || absDelta<limit) return delta;
	return limit*sign;
}

function startInterval(map, touchState) {
	if (touchState.iid) clearInterval(touchState.iid);
	touchState.iid=setInterval(function() {
		var	northing=clampMove(touchState.dn), easting=clampMove(touchState.de);
		if (northing || easting) {
			map.moveBy(easting, northing);
			touchState.dn-=northing;
			touchState.de-=easting;
		}
	}, 65);
}

/*
function logTouchState(label, touchState) {
	var i,
		touches=touchState.t||[],
		msg='TouchState(' + label + '): touches=' + touches.length;
	for (i=0; i<touches.length; i++) {
		msg+=' coord' + i + '=(' + touches[i].x + ',' + touches[i].y + ')';
	}
	
	console.log(msg);
}
*/

MapSurfaceMethods._handleTouch=function(event) {
	event.preventDefault();
	//console.log('[touch event]: ' + event.type);
	
	var self=this,
		touchState=this._touchState,
		existingTouches=touchState.t.length,
		deltaX, deltaY,
		startZoom, newZoom;
	
	
	switch (event.type) {
	case 'touchmove':
		recordTouches(this, touchState, event);
		if ((touchState.s==='move' || touchState.s==='start') && touchState.t.length===1) {
			touchState.s='move';
			touchState.de+=touchState.l.x - touchState.t[0].x;
			touchState.dn+=touchState.t[0].y - touchState.l.y; // invert northing
			touchState.l=touchState.t[0];
			
			//this.moveBy(touchState.de, touchState.dn);
		}
		
		break;
	
	case 'gesturechange':
		// If not in gesture state, find and stash the center point
		if (touchState.s!=='gesture') {
			touchState.c=calculateCenter(touchState);
			touchState.z=map.getZoom();
		}

		// Upgrade to a gesture state (prevents moving)
		touchState.s='gesture';
		
		startZoom=touchState.z;
		newZoom=startZoom+Math.log(event.scale)*1.5;
		//console.log('Scale OrigLevel=' + touchState.z + ', newLevel=' + newZoom + ' scale=' + event.scale);
		//if (touchState.tkey) clearTimeout(touchState.tkey);
		//touchState.tkey=setTimeout(function() {
			self.setZoom(newZoom, touchState.c.x, touchState.c.y);
			//touchState.tkey=null;
		//}, 0);
	
		break;
		
	case 'touchstart':
		recordTouches(this, touchState, event);
		if (existingTouches==0 && touchState.t.length) {
			// Transition from no touches to a first touch
			touchState.s='start';
			
			touchState.dn=0;	// Delta-northing
			touchState.de=0;	// Delta-easting
			
			startInterval(this, touchState);
			
			// Reset last (for moving)
			touchState.l=touchState.t[0];
		}			
		break;
	
	case 'touchend':
		recordTouches(this, touchState, event);
		if (!touchState.t.length) clearTouchState(touchState);
		if (touchState.de||touchState.dn) this.moveBy(touchState.de, touchState.dn);
		break;
		
	case 'gestureend':
		clearTouchState(touchState);
		break;
		
	case 'touchmove':
		recordTouches(this, touchState, event);
		if ((touchState.s==='move' || touchState.s==='start') && touchState.t.length===1) {
			touchState.s='move';
			deltaX=touchState.l.x - touchState.t[0].x;
			deltaY=touchState.l.y - touchState.t[0].y;
			touchState.l=touchState.t[0];
			
			this.moveBy(deltaX, -deltaY);	// Invert northing
		}
		
		break;
		
	case 'touchcancel':
		clearTouchState(touchState);
		break;
	
	}
};

function touchEventDispatcher(map) {
	return function(event) {
		return map._handleTouch(event);
	};
}

// Attach to initialization
if (touchEligible()) {
	MapSurfaceMethods.advise('initialize', 'after', function(options) {
		this._touchState={t:[]};
		var events=['touchstart', 'touchend', 'touchmove', 'touchcancel',
					'gesturechange', 'gestureend' ],
			listener=touchEventDispatcher(this);
			
		for (i=0; i<events.length; i++) {
			this.elements.event.addEventListener(events[i], listener, true);
		}
	});
}

