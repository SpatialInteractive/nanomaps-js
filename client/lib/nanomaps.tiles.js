/**
 * nanomaps.tiles.js
 * Manage a tile layer using canvas elements to handle rendering.
 * This module is a nanomaps "overlay" module in that it does not define
 * its own namespace, but rather adds to the nanomaps namespace.  See also
 * nanomaps.itiles.js which replaces various bits of this implementation
 * with a traditional "image mosaic" rendering if the browser does not
 * support canvas.
 */
(function(nanomaps) {

function CanvasTileLayer(options) {
	
}
CanvasTileLayer.prototype={
	unmanaged: true,
	
	createElement: function(map) {
		var screen=map.createElement('canvas');
		screen.mapDelegate=this;
		
		return screen;
	}
};
	
/**
 * Class representing a tile selector for the layout of OSM, MS, Google, et al.
 * Options:
 *
 */
function TileSelector(options) {
	// set defaults
	this.tileSize=options.tileSize||256;
	this.srcSpec="http://otile${modulo:1,2}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png";
}
TileSelector.prototype={
	/**
	 * Gets the origin in physical units [x, y] for the tile coordinate space
	 */
	origin: function(projection) {
		var ret=this._origin;
		if (!ret) {
			ret=projection.forward(-180, 85.05112878);
			this._origin=ret;
		}
		return ret;
	},
	
	/**
	 * Get an img src from the tileDesc
	 */
	resolveSrc: function(tileDesc) {
		return this.srcSpec.replace(/\$\{([A-Za-z]+)(\:([^\}]*))?\}/g, function(s, name, ignore, args) {
			if (name==='modulo') {
				// get the args and modulo it by the tileDesc.tileX
				args=args.split(/\,/);
				return args[tileDesc.tileX%args.length];
			} else {
				return tileDesc[name];
			}
		});
	},
	
	/**
	 * Select all tiles that intersect the given bounding box at the
	 * given resolution.  Return an array of TileDesc elements, where
	 * each TileDesc has the following attributes:
	 *   - key: an opaque string that uniquely identifies this tile within
	 *     this instance where multiple requests for the same physical tile
	 *     have the same key
	 *   - res: the native resolution of the tile
	 *	 - level: the native zoom level
	 *   - x, y: origin at native resolution,
	 *	 - size: tile size (width/height) at native resolution
	 *   - tileX, tileY: the tile x and y
	 */
	select: function(projection, resolution, x, y, width, height, sort) {
		var tileStartX, tileStartY,
			tileEndX, tileEndY,
			tileMidX, tileMidY,
			i, j, tileDesc,
			nativeLevel=Math.round(projection.toLevel(resolution)),
			nativeResolution=projection.fromLevel(nativeLevel),
			unscaledOrigin=this.origin(projection),
			tileSize=this.tileSize,
			nativeOriginX=unscaledOrigin[0]/nativeResolution,
			nativeOriginY=unscaledOrigin[1]/nativeResolution,
			nativeScaleFactor=resolution / nativeResolution,
			retList=[];

		// Scale x,y,width,height to our nativeResolution
		x=x*nativeScaleFactor;
		y=y*nativeScaleFactor;
		width=width*nativeScaleFactor;
		height=height*nativeScaleFactor;
		
		// Find the grid of tiles that intersect
		tileStartX=Math.floor( (x - nativeOriginX) / tileSize );
		tileStartY=Math.floor( (nativeOriginY - y) / tileSize );		// y-axis inversion
		tileEndX=Math.floor( ((x+width) - nativeOriginX ) / tileSize );
		tileEndY=Math.floor( (nativeOriginY - (y-height)) / tileSize );	// y-axis inversion
		//debugger;
		// Loop and report each one
		for (j=tileStartY; j<=tileEndY; j++) {
			for (i=tileStartX; i<=tileEndX; i++) {
				tileDesc={
					key: nativeLevel + ':' + i + ':' + j,
					res: nativeResolution,
					level: nativeLevel,
					tileX: i,
					tileY: j,
					size: tileSize,
					x: nativeOriginX + i*tileSize,
					y: nativeOriginY - j*tileSize	// y-axis inversion
				};
				
				retList.push(tileDesc);
			}
		}
		
		// Sort by proximity to center tile
		if (sort) {
			tileMidX=(tileStartX+tileEndX)/2;
			tileMidY=(tileStartY+tileEndY)/2;
			retList.sort(function(a, b) {
				var xa=Math.abs(a.tileX-tileMidX),
					ya=Math.abs(a.tileY-tileMidY),
					weighta=xa*xa+ya*ya,
					xb=Math.abs(b.tileX-tileMidX),
					yb=Math.abs(b.tileY-tileMidY),
					weightb=xb*xb+yb*yb;
				return weighta-weightb;
			});
		}
		
		return retList;
	}
};



// Exports
nanomaps.TileSelector=TileSelector;
nanomaps.CanvasTileLayer=CanvasTileLayer;

})(nanomaps);

