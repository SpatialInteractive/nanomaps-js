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
	curve: MakeBezierCurve(0.25, 0.25, 0.33, 0.33),
	duration: 0.5,
	rate: 20
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

