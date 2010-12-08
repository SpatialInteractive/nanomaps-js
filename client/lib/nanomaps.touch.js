/**
 * Extend MapSurface with standard support for desktop event handling:
 *  - mouse events
 *  - mouse cursors
 *  - translation of desktop events to gestures
 */
(function(nanocore) {
	var MapSurfaceMethods=nanocore.MapSurface.prototype;
	
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
				deltaX=touchState.l.x - touchState.t[0].x;
				deltaY=touchState.l.y - touchState.t[0].y;
				touchState.l=touchState.t[0];
				
				this.moveBy(deltaX, -deltaY);	// Invert northing
			}
			
			break;
		
		case 'gesturechange':
			// If not in gesture state, find and stash the center point
			if (touchState.s!=='gesture') {
				touchState.c=calculateCenter(touchState);
				touchState.z=map.getLevel();
			}
	
			// Upgrade to a gesture state (prevents moving)
			touchState.s='gesture';
			
			startZoom=touchState.z;
			newZoom=startZoom+Math.log(event.scale)*1.5;
			//console.log('Scale OrigLevel=' + touchState.z + ', newLevel=' + newZoom + ' scale=' + event.scale);
			//if (touchState.tkey) clearTimeout(touchState.tkey);
			//touchState.tkey=setTimeout(function() {
				self.setLevel(newZoom, touchState.c);
				//touchState.tkey=null;
			//}, 0);
		
			break;
			
		case 'touchstart':
			recordTouches(this, touchState, event);
			if (existingTouches==0 && touchState.t.length) {
				// Transition from no touches to a first touch
				touchState.s='start';
				
				// Reset last (for moving)
				touchState.l=touchState.t[0];
			}			
			break;
		
		case 'touchend':
			recordTouches(this, touchState, event);
			if (!touchState.t.length) clearTouchState(touchState);
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
	MapSurfaceMethods.advise('initialize', 'after', function(options) {
		this._touchState={t:[]};
		var events=['touchstart', 'touchend', 'touchmove', 'touchcancel',
					'gesturechange', 'gestureend' ],
			listener=touchEventDispatcher(this);
			
		// NOTE: We must attach touch events to the glass element.  Webkit
		// seems to randomly cancel touch events if any DOM structure
		// in the containment hierarchy gets modified "too much".  The only
		// way I could find around this was to use such a transparent overlay.
		// We're going to need to pump events back to the source later.
		this.elements.glass.style.display='block';
		for (i=0; i<events.length; i++) {
			this.elements.glass.addEventListener(events[i], listener, true);
		}
	});
})(nanocore);

