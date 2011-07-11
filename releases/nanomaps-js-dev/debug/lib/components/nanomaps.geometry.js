/**
 * nanomaps.geometry.js
 * Geometry primitives
 */

// Helpers to get x/y alias names
var X_NAMES=['x', 'lng', 'longitude', 'lon'],
	Y_NAMES=['y', 'lat', 'latitude'];
function firstNumeric(object, props) {
	var i,v,t;
	for (i=0; i<props.length; i++) {
		v=object[props[i]];
		if (v!==undefined && v!==null) {
			t=typeof v;
			if (t==='number') return v;
			else if (t==='function') return Number(v.call(object));
		}
	}
	return NaN;
}
	
/**
 * Abstracts out a single point in a global coordinate system.
 * This may be neurotic, but my brain is wired to think of (latitude,longitude)
 * and when its in that mode, I can't get it in my head that x=longitude and
 * y=latitude (in fact, just after writing this sentence I had to read it 3 times
 * because that didn't quite look right).  
 * As a further neurosis, I spent my productive map-engaged years abbreviating them (lat,lng).
 * <p>
 * So the presence of this class is a tip of the hat to the fact that no one
 * can cure the brain and quirky habits are better indulged in old age than
 * challenged.  Everyone else can just go on using (x,y) and remembering
 * the difference.  I name things explicitly here so as not to get confused.  Surely
 * a lifetime of abuse is worth a few bytes in a library.
 * <p>
 * The entire rest of the library deals in (x,y).  I've tried to keep any concept
 * of latitude and longitude here in the form of helper methods.  The "public" api
 * should pass around instances of this class.  The bits under the covers, though
 * will often just passes x's and y's nakedly (ie. see MapState).
 * <p>
 * This class is also structured to allow some future refactoring to support double
 * or integral E6 coordinates.  This could save some space with lots instances (maybe,
 * depending on alignment) but my intuition tells me it is probably not a speed savings
 * since we've got to go back to double anyway for projection math.  In my experience
 * this is usually a premature optimization, but I leave the option open by way of a subclass.
 * <p>
 * Ok, that's enough of a treatise on a simple Coordinate class.
 *
 * @constructor
 * @name nanomaps.Coordinate
 * @param x horizontal coordinate
 * @param y vertical coordinate
 * @author stella
 */
function Coordinate(x,y) {
	this._x=Number(x);
	this._y=Number(y);
}
/**
 * Static function for returning a coordinate given
 * latitude,longitude.  This is here just to make sure
 * I get it right instead of relying on my memory that
 * lat=y and lng=x.
 * @public
 * @name latLng
 * @methodOf nanomaps.Coordinate
 * @param lat {Number}
 * @param lng {Number}
 * @return {Coordinate}
 */
Coordinate.latLng=function(lat, lng) {
	return new Coordinate(lng, lat);
};

/**
 * Factory method for constructing a coordinate from (x,y)
 * @public
 * @name xy
 * @methodOf nanomaps.Coordinate
 * @param x {Number}
 * @param y {Number}
 * @return {Coordinate}
 */
Coordinate.xy=function(x,y) {
	return new Coordinate(x,y);
};

/**
 * Generic conversion function to produce a Coordinate
 * from a variety of objects.  If object is a Coordinate,
 * then object is returned as-is.  Otherwise, the x-coordinate
 * is determined by the first existent property:
 * <ol>
 * <li>x
 * <li>lng
 * <li>longitude
 * <li>lon
 * </ol>
 * The y coordinate is the first property:
 * <ol>
 * <li>y
 * <li>lat
 * <li>latitude
 * </ol>
 * 
 * Alternatively, if object is an array, then it is
 * taken to be [x, y]
 * @public
 * @name from
 * @methodOf nanomaps.Coordinate
 * @param object {Object}
 * @return {Coordinate}
 */
Coordinate.from=function(object) {
	if (object instanceof Coordinate) {
		return object;
	}
	if (object instanceof Array) {
		return new Coordinate(object[0], object[1]);
	}
	var x=firstNumeric(object, X_NAMES),
		y=firstNumeric(object, Y_NAMES);
	return new Coordinate(x,y);
};

Coordinate.prototype={
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	x: function() {
		return this._x;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	y: function() {
		return this._y;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	lat: function() {
		return this._y;
	},
	/**
	 * @public
	 * @memberOf nanomaps.Coordinate.prototype
	 */
	lng: function() {
		return this._x;
	}
};
exports.Coordinate=Coordinate;

/**
 * Simple bounds class with members:
 * <ul>
 * <li>minx
 * <li>miny
 * <li>maxx
 * <li>maxy
 * </ul>
 
 * @constructor
 * @name nanomaps.Bounds
 * @param minx {number}
 * @param miny {number}
 * @param maxx {number}
 * @param maxy {number}
 */
function Bounds(minx,miny,maxx,maxy) {
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.minx=minx;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.miny=miny;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.maxx=maxx;
	/**
	 * @public
	 * @memberOf nanomaps.Bounds.prototype
	 */
	this.maxy=maxy;
}

/**
 * Convert tile x,y,level coordinates to a Microsoft
 * quad-key
 */
function tileXYToQuadkey(tileX, tileY, level) {
	var i, mask, value, ret='';
	for (i=level; i>0; i--) {
		value=48;
		mask=1<<(i-1);
		if ((tileX&mask)!==0) value++;
		if ((tileY&mask)!==0) value+=2;
		ret+=String.fromCharCode(value);
	}
	return ret;
}


