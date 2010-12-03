/**
nanocore.js
Core map display library.

The primary entity defined here is the MapSurface class.  This class manages
a DOM hierarchy for managing the various reference frames that typically make
up a map.  Adding content to a map involves binding Layers to one of the surface's
reference frames.

Reference Frames
----------------
A reference frame is defined by the following tuple:
	1. Z-Level: The numeric z-level of the reference frame in relation to other
		reference frames in a surface.
	2. Coordinate System:
		a. Surface: coordinates are in pixel units relative to the upper left
		   corner of the containing div.  Items added to the surface coordinate
		   system are fixed in relation to the area on the screen allocated to
		   the map (they do not pan with map movement).
		b. Physical: coordinates are in pixel units relative to reference coordinates
		   established against the surface's physical transform.  See below for
		   further explanation.
	3. Rotated (future)
	
Transformations
---------------
To callers, the MapSurface represents its state with the following properties:
	1. Center: The center point in global WGS84 latitude/longitude coordinates
	2. Scale: Projected units per pixel.  The map surface supports arbitrary
	   floating point scales.  Bound layers are responsible for performing
	   appropriate scaling if fixed zoom levels are needed.
	3. Projection: An opaque object for converting to/from global coordinates
	   and "projection units" (typically meters).  The only requirement is that
	   the projection units must be linear.

In addition, many animations of a MapSurface involve interpolating from a specific
Center/Scale to a final Center/Scale.  For this reason, FinalCenter and FinalScale
parameters are also maintained for layers which need to speculatively load based
on the final state.

Internally, the coordinate system that layers see are called physical coordinates
and are aligned to the bottom left of the viewport.  When a scale change occurs,
the top left of the viewport is positioned at (0,0) and represents a specific
lat/lng in post-scaled coordinates.  As the map pans, the top-left of the 
container is repositioned causing the illusion of sliding.

Layers
------
Content is added to a reference frame by binding a layer to the frame.  For physical
reference frames, the layer must implement callbacks for updating the position
of the managed objects on scale/projection changes.  A number of layers are defined
to make this easy for common use cases (TileLayer, ShapeLayer, etc).
*/

var nanoutils=(function(exports) {

// module suffix
return exports;
})({});


var nanocore=(function(exports) {
/**
 * Instantiate a MapSurface, attaching it to the given element.
 * Options can contain the following attributes:
 *		- width/height: If specified, then the size of the owning element is
 * 			set accordingly.  Otherwise, get the width/height from the element's
 *			bounds.
 *		- center: If specified should be an object containing lat/lng fields
 *			representing the initial center (defaults to 0,0)
 */
function MapSurface(elt, options) {
	if (!options) options={};
	var width=options.width, height=options.height;
	this._elt=elt;
	
	// Fixed size or autosize
	if (typeof width!=='number' || typeof height!=='number') {
		// Auto width/height (get inner size)
		width=elt.clientWidth;
		height=elt.clientHeight;
	}
	
	// Hardcode size
	elt.style.width=width+'px';
	elt.style.height=height+'px';
	this.width=width;
	this.height=height;
	
	// Initialize position, scale and projection
	this.projection=options.projection||projections.WebMercator;
	this.center=options.center||this.projection.DEFAULT_CENTER;
	this.scale=options.scale||this.projection.DEFAULT_SCALE;
}

var Projections={
	/**
	 * Standard "Web Mercator" projection as used by Google, Microsoft, OSM, et al.
	 */
	WebMercator: new function() {
		this.DEFAULT_CENTER={lat:39.7406, lng:-104.985441};
		this.DEFAULT_SCALE=108000;
	
		var EARTH_RADIUS=6378137.0,
			DEG_TO_RAD=.0174532925199432958,
			RAD_TO_DEG=57.29577951308232,
			FOURTHPI=0.78539816339744833,
			HALFPI=1.5707963267948966;
		
		this.forward=function(xy) {
			return {
				x: xy.x*DEG_TO_RAD * EARTH_RADIUS, 
				y: Math.log(Math.tan(FOURTHPI + 0.5 * DEG_TO_RAD * xy.y)) * EARTH_RADIUS 
			};
		};
		
		this.inverse=function(xy) {
			return {
				x: RAD_TO_DEG * xy.x / EARTH_RADIUS,
				y: RAD_TO_DEG * (HALFPI - 2. * Math.atan(Math.exp(-xy.y/EARTH_RADIUS)))
			};
		};
	}
};


// Exports
exports.MapSurface=MapSurface;
exports.Projections=Projections;

// module suffix
return exports;
})({});
