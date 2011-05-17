/**
 * nanomaps.projections.js
 * Currently just the WebMercator projection
 */
 
/**
 * @namespace Projections
 * @name nanomaps.Projections
 */
var Projections={
	/**
	 * Standard "Web Mercator" projection as used by Google, Microsoft, OSM, et al.
	 * Instantiate as new WebMercator(options). 
	 * @class
	 * @name nanomaps.Projections.WebMercator
	 * @param {Number} [options.MIN_LEVEL=1]
	 * @param {Number} [options.MAX_LEVEL=18]
	 */
	WebMercator: function(options) {
		if (!options) options={};
		/**
		 * Default center for this projection
		 * @public
		 * @name DEFAULT_CENTER
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.DEFAULT_CENTER={lat:39.7406, lng:-104.985441};
		/**
		 * Default resolution for this projection
		 * @public
		 * @name DEFAULT_RESOLUTION
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.DEFAULT_RESOLUTION=611.4962;
		
		/**
		 * WebMercator does not have an x inversion
		 * @public
		 * @name XINVERTED
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.XINVERTED=false;

		/**
		 * WebMercator <b>does</b> have a y inversion
		 * @public
		 * @name XINVERTED
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.YINVERTED=true;
		
		var EARTH_RADIUS=6378137.0,
			DEG_TO_RAD=.0174532925199432958,
			RAD_TO_DEG=57.29577951308232,
			FOURTHPI=0.78539816339744833,
			HALFPI=1.5707963267948966,
			HIGHEST_RES=78271.5170;
		
		/**
		 * Minimum valid level
		 * @public
		 * @name MIN_LEVEL
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.MIN_LEVEL=options.MIN_LEVEL||1;
		/**
		 * Maximum valid level
		 * @public
		 * @name MAX_LEVEL
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.MAX_LEVEL=options.MAX_LEVEL||18;
		
		/**
		 * Convert from global to projected units (x) 
		 * @public
		 * @name fwdX
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @return {Number}
		 */
		this.fwdX=function(x) {
			return x*DEG_TO_RAD * EARTH_RADIUS; 
		};


		/**
		 * Convert from global to projected units (y) 
		 * @public
		 * @name fwdY
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} y
		 * @return {Number}
		 */
		this.fwdY=function(y) {
			return Math.log(Math.tan(FOURTHPI + 0.5 * DEG_TO_RAD * y)) * EARTH_RADIUS; 
		};
		
		/**
		 * Convert from projected to global units (x) 
		 * @public
		 * @name invX
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} x
		 * @return {Number}
		 */
		this.invX=function(x) {
			return RAD_TO_DEG * x / EARTH_RADIUS;
		};

		/**
		 * Convert from projected to global units (y) 
		 * @public
		 * @name invY
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} y
		 * @return {Number}
		 */
		this.invY=function(y) {
			return RAD_TO_DEG * (HALFPI - 2. * Math.atan(Math.exp(-y/EARTH_RADIUS)));
		};
		
		/**
		 * Return the resolution (m/px) for the given zoom index given a standard
		 * power of two zoom breakdown.
		 * @public
		 * @name fromLevel
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} level
		 * @return {Number} resolution
		 */
		this.fromLevel=function(level) {
			return HIGHEST_RES/Math.pow(2, level-1);
		};
		
		/**
		 * Return the level for the given resolution on the standard power of
		 * two scale.
		 * @public
		 * @name toLevel
		 * @methodOf nanomaps.Projections.WebMercator#
		 * @param {Number} resolution
		 * @return {Number} level
		 */
		this.toLevel=function(resolution) {
			return Math.log(HIGHEST_RES/resolution) / Math.log(2) + 1;
		};

		/**
		 * Bounds object defining map extent in global
		 * coordinates.
		 * @public
		 * @name GLOBAL_EXTENT
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		var GLB_EXTENT=this.GLB_EXTENT=new Bounds(
			-180.0, -85.05112878, 180.0, 85.05112878
			);
			
		/**
		 * Bounds object defining map extent in projected
		 * coordinates
		 * @public
		 * @name GLOBAL_EXTENT
		 * @memberOf nanomaps.Projections.WebMercator#
		 */
		this.PRJ_EXTENT=new Bounds(
			this.fwdX(GLB_EXTENT.minx),
			this.fwdY(GLB_EXTENT.miny),
			this.fwdX(GLB_EXTENT.maxx),
			this.fwdY(GLB_EXTENT.maxy)
			);
		
		// release memory from closure
		options=null;
	}
};

exports.Projections=Projections;

