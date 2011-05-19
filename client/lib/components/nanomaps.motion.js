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
	DOUBLE_CLICK_MS=280;

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
	 * occurred.
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
		}, DOUBLE_CLICK_MS);
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
		
		map.dispatchMotionEvent(me);
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
			deltaX, deltaY,
			me;
		
		switch (event.type) {
		case 'mousedown':
			if (clickState && clickState.s===STATE_CLICK_PEND) {
				if ((now()-clickState.t)>DOUBLE_CLICK_MS) {
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
				
				map.dispatchMotionEvent(me);
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
		
		map.dispatchMotionEvent(me);
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
			parent=elements.parent;
		
		if (enableClick) {
			// Just listen for mousedown to start with
			// We will listen for mousemove and mouseup
			// on document when we enter a down state
			addEventListener(target, 'mousedown', clickHandleEvent);
			
			// Also listen on the parent so that we get mousedowns
			// that bubble up the hierarchy from inactive elements
			addEventListener(parent, 'mousedown', clickHandleEvent);
		}
		
		if (enableWheel) {
			addEventListener(target, 'DOMMouseScroll', wheelHandleEvent);
			addEventListener(target, 'mousewheel', wheelHandleEvent);
		}
		
		if (enableTouch) {
			
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
	this.elements.event.style.cursor='move';
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
	this.emit('motion.' + motionEvent.type, motionEvent);
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
	
	var type=motionEvent.type;
	if (type==='drag') {
		map.moveBy(motionEvent.deltaX, -motionEvent.deltaY);
	} else if (type==='scroll') {
		this.setZoom(this.getZoom()+motionEvent.deltaZoom, 
			motionEvent.x, motionEvent.y);
	} else if (type==='click' && motionEvent.count===2) {
		// Double-click to zoom
		this.begin();
		this.zoomIn(motionEvent.x, motionEvent.y);
		this.commit(true);
	}
};


