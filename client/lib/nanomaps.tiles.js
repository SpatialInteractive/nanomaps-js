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

// -- Tile Layer
function makeVisibleOnLoad() {
	this.style.visibility='';
}

function TileCache() {
	var contents={},
		marked=[];
	
	function disposeTileDesc(tileDesc) {
		if (tileDesc.img&&tileDesc.img.parentNode) 
			// Detach
			tileDesc.img.parentNode.removeChild(tileDesc.img);
	}
		
	this.mark=function() {
		marked.length=0;
	};
	
	this.free=function() {
		var newContents={},
			key, i, tileDesc;
			
		// Add all marked to the new dictionary
		for (i=0; i<marked.length; i++) {
			tileDesc=marked[i];
			key=tileDesc.key;
			newContents[key]=tileDesc;
			delete contents[key];
		}
		
		// Any existing in contents are to be discarded
		for (i in contents) {
			tileDesc=contents[i];
			disposeTileDesc(tileDesc);
		}
		
		// Swap
		contents=newContents;
		marked.length=0;
	};
	
	this.use=function(tileDesc) {
		var key=tileDesc.key,
			existing=contents[key];
		if (existing) {
			disposeTileDesc(tileDesc);
			tileDesc=existing;
		}
		contents[key]=tileDesc;
		if (marked) marked.push(tileDesc);
		return tileDesc;
	};
	
	this.take=function(tileDesc) {
		var key=tileDesc.key,
			existing=contents[key];
		if (existing) {
			delete contents[key];
			return existing;
		}
		return tileDesc;
	};
	
	this.each=function(callback) {
		var i, tileDesc;
		for (i in contents) {
			tileDesc=contents[i];
			if (tileDesc && typeof tileDesc==='object')
				callback(tileDesc);
		}
	};
	
	this.clear=function() {
		contents={};
		marked.length=0;
	};
	
	this.moveFrom=function(otherCache) {
		otherCache.each(function(tileDesc) {
			var key=tileDesc.key;
			if (contents[key]) {
				// Already exists.  Delete
				disposeTileDesc(tileDesc);
			} else
				contents[tileDesc.key]=tileDesc;
		});
		otherCache.clear();
	};
}

/**
 * Construct a standard TileLayer that can be attached to a MapSurface.  If a
 * TileSelector is not passed in the options, then a default is constructed and
 * options are passed to it.  See the options accepted by the TileSelector
 * constructor for additional parameters.
 *
 * @example 
 * var map=new nanomaps.MapSurface(someElement);
 * map.attach(new nanomaps.TileLayer({ 
 *    tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png" })); 
 *
 * @class
 * @name nanomaps.TileLayer
 * @param {TileSelector} [options.selector] describes the source and geometry of the
 * tiles
 * @param {integer} [options.buffer=64] The number of pixels to actively buffer on
 * all sides of the map
 */
function TileLayer(options) {
	this.options=options=options||{};
	this.sel=options.selector||new TileSelector(options);
	this.fgCache=new TileCache();
	this.bgCache=new TileCache();
}
TileLayer.prototype={
	/**
	 * Returns a new element ready to be added to the MapSurface.  This method
	 * fulfills the contract for MapSurface.attach.
	 * @public
	 * @methodOf nanomaps.TileLayer.prototype
	 * @name createElement
	 * @param {MapSurface} map
	 * @return {HTMLElement}
	 */
	createElement: function(map) {
		var element=document.createElement('div');
		element.style.position='absolute';
		element.style.left='0px';
		element.style.top='0px';
		element.mapDelegate=this;
		return element;
	},
	
	/**
	 * @private
	 */
	placeTile: function(map, element, tileDesc, moveToFront) {
		var img=tileDesc.img,
			transform=map.transform,
			zpx=transform.zpx,
			scaleFactor=tileDesc.res / transform.res;
			
		if (img&&img._error) {
			// Zero it out
			if (img.parentElement) img.parentElement.removeChild(img);
			tileDesc.img=null;
			img=null;
		}
		
		// If no valid img, instantiate it
		if (!img) {
			img=map.createElement('img');
			img.style.visibility='hidden';
			img.onload=makeVisibleOnLoad;
			img.style.position='absolute';
			img.src=this.sel.resolveSrc(tileDesc);
			tileDesc.img=img;
		}
		
		// Set position and size
		img.width=Math.ceil(tileDesc.size*scaleFactor);
		img.height=Math.ceil(tileDesc.size*scaleFactor);
		img.style.left=Math.round(tileDesc.x*scaleFactor - zpx[0]) + 'px';
		img.style.top=Math.round(zpx[1] - tileDesc.y*scaleFactor) + 'px';	// y-axis inversion
		if (moveToFront || img.parentNode!==element) element.appendChild(img);
	},
	
	/**
	 * @private
	 */
	onreset: function(map, element) {
		var self=this,
			transform=map.transform,
			buffer=self.options.buffer||64,
			ulXY=map.toGlobalPixels(-buffer,-buffer),
			width=map.width+buffer,
			height=map.height+buffer,
			curResolution=self.curResolution,
			displayResolution=transform.res,
			tileList=self.sel.select(transform.prj, displayResolution, ulXY.x, ulXY.y, width, height, true),
			fgCache=self.fgCache,
			bgCache=self.bgCache,
			refreshBackground=false,
			i,
			tileDesc;
			
		if (curResolution&&curResolution!==displayResolution) {
			// We have a scale change.  Snapshot the current tile
			// cache as the background cache and start on a new one
			bgCache.mark();
			bgCache.free();
			bgCache.moveFrom(fgCache);
			refreshBackground=true;
		}

		fgCache.mark();
		for (i=0; i<tileList.length; i++) {
			tileDesc=fgCache.use(bgCache.take(tileList[i]));
			self.placeTile(map, element, tileDesc, true);
		}
		fgCache.free();

		// Record so that the next time through we can tell whether
		// this is a simple change
		this.curResolution=displayResolution;
		
		if (refreshBackground) {
			bgCache.each(function(tileDesc) {
				self.placeTile(map, element, tileDesc);
			});
		}
		
	},
	
	/**
	 * @private
	 */
	onposition: function(map, element) {
		this.onreset(map, element);
	}
};

/**
 * Class representing a tile selector for the layout of OSM, MS, Google, et al.
 * <p>
 * Typically, all that will need to be specified is options.tileSrc.  This string
 * will be interpolated relative to the tile information with the following
 * substitutions made:
 * <ul>
 * <li>${level} - Native level of the tile
 * <li>${tileX} - X coordinate of the tile
 * <li>${tileY} - Y coordinate of the tile
 * <li>${modulo:a,b} - Select one of the values in the list (in this case 'a' and 'b')
 *     based on a stable modulus based on the tile coordinate system.  Used to
 *     pick a domain name for a given tile.
 * </ul>
 * <p>
 * Remember to always provide proper attribution and get permission for using tiles.
 * <p>
 * The following tileSrc can be used to display tiles from different providers:
 * <ul>
 * <li>OSM (MapQuest): 
 * 		"http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png"
 * <li>OSM (Mapnik from openstreetmap.org): "http://${modulo:a,b,c}.tile.openstreetmap.org/${level}/${tileX}/${tileY}.png"
 * </ul>
 *
 * @class
 * @name nanomaps.TileSelector
 * @param {integer} [options.tileSize=256]
 * @param {string} [options.tileSrc='']
 */
function TileSelector(options) {
	options=options||{};
	// set defaults
	this.tileSize=options.tileSize||256;
	this.srcSpec=options.tileSrc||'';
}
TileSelector.prototype={
	/**
	 * Gets the origin in physical units [x, y] for the tile coordinate space
	 * @private
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
	 * @public
	 * @name resolveSrc
	 * @methodOf nanomaps.TileSelector.prototype
	 * @param {TileDesc} tileDesc tile description returned from select
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
	 * <ul>
	 *   <li>key: an opaque string that uniquely identifies this tile within
	 *     this instance where multiple requests for the same physical tile
	 *     have the same key
	 *   <li>res: the native resolution of the tile
	 *	 <li>level: the native zoom level
	 *   <li>x, y: origin at native resolution,
	 *	 <li>size: tile size (width/height) at native resolution
	 *   <li>tileX, tileY: the tile x and y
	 * </ul>
	 * @public
	 * @name select
	 * @methodOf nanomaps.TileSelector.prototype
	 * @param {Projection} projection map projection
	 * @param {Number} resolution resolution at which tiles will be rendered
	 * @param {Number} x Global pixel coordinate relative to projection and resolution
	 * of the upper left corner of the region to select
	 * @param {Number} y Global pixel coordinate relative to projection and resolution
	 * of the upper left corner of the region to select
	 * @param {Number} width Pixel width of region to select
	 * @param {Number} height Pixel height of the region to select
	 * @param {Boolean} sort If true, then returns the tiles sorted by most visually impactful
	 * @return {Array[TileDesc]}
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
//nanomaps.CanvasTileLayer=CanvasTileLayer;
nanomaps.TileLayer=TileLayer;

})(nanomaps);

