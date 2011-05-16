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
(function(nanomaps) {
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
	canvas.mapDelegate=this;	// Circular ref ok.  The only browsers who support svg have decent gc
	this.canvas=canvas;	
}
SvgMarker.prototype={
	//// -- mapDelegate methods
	unmanaged: false,
	
	createElement: function(map) {
		if (this.map) throw new Error('Attempt to add SvgMarker to map more than once');
		this.map=map;
		return this.canvas;
	},
	
	/**
	 * Subclasses should override and must update the size/position
	 * of the canvas and contained elements.
	 */
	onreset: function(map, canvas) {
	},
	
	//// -- stub methods intended for subclassing
	
	//// -- regular instance methods
	
	/**
	 * Resets the element.  This typically happens automatically on map updates
	 * but may need to be triggered manually on property update.
	 * @public
	 */
	invalidate: function() {
		if (this.map) this.onreset(this.map, this.canvas);
	}
};
nanomaps.inherits(SvgMarker, nanomaps.EventEmitter);

function EllipseMarker(settings) {
	SvgMarker.call(this, settings);
	var ellipse=createSvgElement('ellipse');
	this.canvas.appendChild(ellipse);
	this.ellipse=ellipse;
}
EllipseMarker.prototype={
	onreset: function(map, canvas) {
		var ellipse=this.ellipse,
			settings=this.settings,
			rx, ry,
			unit=settings.unit||'px',
			longitude=settings.longitude,
			latitude=settings.latitude,
			canvasWidth, canvasHeight,
			centerX, centerY,
			xy;
		
		// Either calculate rx/ry independently (true ellipse)
		// or just take the radius and fake it to create circles
		// visually.  Accurate for small areas and makes more sense
		// visibly
		if (rx in settings) {
			rx=translateX(map, settings.rx||0, unit);
			ry=translateY(map, settings.ry||0, unit);
			
		} else {
			rx=ry=translateX(map, settings.radius||0, unit);
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
		
		xy=map.transform.toSurface(longitude, latitude);
		if (xy) {
			xy[0]-=centerX;
			xy[1]-=centerY;
			canvas.style.left=xy[0]+'px';
			canvas.style.top=xy[1]+'px';
			canvas.style.width=canvasWidth+'px';
			canvas.style.height=canvasHeight+'px';
			canvas.style.display='block';
		} else {
			canvas.style.display='none';
		}
	}
};
nanomaps.inherits(EllipseMarker, SvgMarker);

//// -- utilities
function oddCeil(n) {
	n=Math.ceil(n);
	if ((n%2)!==1) n++;
	return n;
}

/**
 * TODO: This method is not mathematically sound.
 */
function translateX(map, distance, unit) {
	var res=map.transform.res;
	switch (unit) {
	case 'px': return distance;
	case 'm':
		return distance/res;
	default:
		return 0;
	}
}

/**
 * TODO: This method is not mathematically sound.
 */
function translateY(map, distance, unit) {
	var res=map.transform.res;
	switch (unit) {
	case 'px': return distance;
	case 'm':
		return distance/res;
	default:
		return 0;
	}
}

// exports
nanomaps.SvgMarker=SvgMarker;
nanomaps.EllipseMarker=EllipseMarker;

})(nanomaps);

