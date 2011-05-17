/**
 * nanomaps.tiles.js
 * Provide an "image mosaic" tile layer that can be attach()'d to
 * a MapSurface.  The original version of this module served as the
 * basis for the android version, where further inspiration was had
 * and was then ported back to this version.
 * See the net.rcode.nanomaps.tile package.
**/

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
 * <li>${quadkey} - Microsoft quadkey representation of tile index
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
 * @name nanomaps.CartesianTileSelector
 * @param {integer} [options.tileSize=256]
 * @param {string} [options.tileSrc='']
 */
function CartesianTileSelector(options) {
	options=options||{};
	// set defaults
	this.tileSize=options.tileSize||256;
	this.srcSpec=options.tileSrc||'';
}
CartesianTileSelector.prototype={
	destroyTile: function(tile) {
		// TODO
	},
	
	destroyDrawable: function(tile, drawable) {
		// TODO
	},
	
	loadTile: function(tile, sourceTileSet, loadNew) {
		var src=this.resolveSrc(tile.tileKey);
		console.log('Load tile ' + tile.tileKey.level + '@' + tile.tileKey.tileX + ',' + tile.tileKey.tileY);

		setTimeout(function() {
			var imgElt=document.createElement('img');
			imgElt.src=src;
			tile.update(imgElt);
		}, 2000);
	},
	
	/**
	 * Get an img src from the tileDesc
	 * @public
	 * @name resolveSrc
	 * @methodOf nanomaps.TileSelector.prototype
	 * @param {TileKey} TileKey returned from select
	 */
	resolveSrc: function(tileKey) {
		return this.srcSpec.replace(/\$\{([A-Za-z]+)(\:([^\}]*))?\}/g, function(s, name, ignore, args) {
			if (name==='quadkey') {
				return tileXYToQuadkey(tileKey.tileX, tileKey.tileY, tileKey.level);
			} else if (name==='modulo') {
				// get the args and modulo it by the tileDesc.tileX
				args=args.split(/\,/);
				return args[tileKey.tileX%args.length];
			} else {
				return tileKey[name];
			}
		});
	},
	
	/**
	 * Select all tiles that intersect the given bounding box at the
	 * given resolution.  Return an array of TileKey elements.  The coordinates
	 * define a bounding box in projected units (resolution invariant).
	 *
	 * @public
	 * @name select
	 * @methodOf nanomaps.CartesianTileSelector.prototype
	 * @param {Projection} projection map projection
	 * @param {Number} resolution resolution at which tiles will be rendered
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x2
	 * @param {Number} y2
	 * @return {Array[TileDesc]}
	 */
	select: function(projection, resolution, x1, y1, x2, y2) {
		// - Projection setup
		var tileSize=this.tileSize,
			projectedBounds=projection.PRJ_EXTENT,
			xinversion=projection.XINVERTED,
			yinversion=projection.YINVERTED,
			nativeLevel=Math.round(projection.toLevel(resolution)),
			nativeResolution=projection.fromLevel(nativeLevel),
			nativeOriginX,
			nativeOriginY;
			
		x1/=nativeResolution;
		y1/=nativeResolution;
		x2/=nativeResolution;
		y2/=nativeResolution;
		
		// Axis inversion madness - gotta love it
		if (yinversion) {
			// Common path
			nativeOriginY=projectedBounds.maxy / nativeResolution;
			y1=nativeOriginY - y1;
			y2=nativeOriginY - y2;
		} else {
			nativeOriginY=projectedBounds.miny / nativeResolution;
			y1=y1 - nativeOriginY;
			y2=y2 - nativeOriginY;
		}
		
		if (xinversion) {
			nativeOriginX=projectedBounds.maxx / nativeResolution;
			x1=nativeOriginX - x1;
			x2=nativeOriginX - x2;
		} else {
			// Common path
			nativeOriginX=projectedBounds.minx / nativeResolution;
			x1=x1 - nativeOriginX;
			x2=x2 - nativeOriginX;
		}
		
		// - Iteration
		var startX=Math.floor(Math.min(x1,x2)/tileSize),
			startY=Math.floor(Math.min(y1,y2)/tileSize),
			endX=Math.floor(Math.max(x1,x2)/tileSize),
			endY=Math.floor(Math.max(y2,y2)/tileSize),
			i, j,
			projectedX, projectedY,
			ret=[];
	
		for (j=startY; j<=endY; j++) {
			if (yinversion) {
				// Common path
				projectedY=nativeOriginY - j*tileSize;
			} else {
				projectedY=nativeOriginY + j*tileSize;
			}
				
			for (i=startX; i<=endX; i++) {
				if (xinversion) {
					projectedX=nativeOriginX - i*tileSize;
				} else {
					// Common path
					projectedX=nativeOriginX + i*tileSize;
				}
				
				ret.push(new CartesianTileKey(
					nativeLevel,
					i,
					j,
					nativeResolution,
					projectedX,
					projectedY,
					tileSize
				));
			}
		}
		
		return ret;
	}
};


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
	if (!options) options={};
	this.options=options;
	this.sel=new CartesianTileSelector(options);
	
	// TileSets
	this.current=new TileSet();
	this.old=new TileSet();
}
TileLayer.prototype={
	unmanaged: true,
	
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
	onposition: function(map, element) {
		this.onreset(map, element);
	},
	
	/**
	 * TODO: Port transition parts back in later
	 * @private
	 */
	onreset: function(map, element) {
		var currentTileSet=this.current,
			oldTileSet=this.old,
			mapState=map.mapState,
			right=mapState.w-1,
			bottom=mapState.h-1,
			updatedKeys,
			i,
			key,
			tile,
			newTiles=[];
			
		currentTileSet.resetMarks();
		
		// Select tiles that intersect our display area
		updatedKeys=this.sel.select(mapState.prj,
			mapState.res,
			mapState.getPrjX(0,0),
			mapState.getPrjY(0,0),
			mapState.getPrjX(right,bottom),
			mapState.getPrjY(right,bottom));

		// Match them up against what we are already displaying
		for (i=0; i<updatedKeys.length; i++) {
			key=updatedKeys[i];
			tile=currentTileSet.get(key);
			if (!tile) {
				// The tile we are looking for isn't on the screen
				tile=new Tile(this.sel, key);
				currentTileSet.add(tile);
				newTiles.push(tile);
			}
			tile.mark=true;
			
			setTileBounds(mapState, tile);
		}
		
		// If we are generating previews, then we need to sweep
		// no longer used tiles into the oldTileSet and update their
		// display metrics so that the new tiles can use them for
		// previews
		if (newTiles.length>0) {
			currentTileSet.sweep(oldTileSet, function(tile) {
				setTileBounds(mapState, tile);
			});
		}
		
		// newTileRecords now contains all records that have been newly allocated.
		// We initialize them here in this ass-backwards way because we want to sort
		// them by proximity to the center but don't have the display information until
		// after we've iterated over all of them.  Think of this as the "initialize new
		// tiles" loop
		// sortTiles(newTiles);
		for (i=0; i<newTiles.length; i++) {
			tile=newTiles[i];
			this.sel.loadTile(tile, oldTileSet, true);
			tile.attach(element);
		}
		
		currentTileSet.sweep();
		oldTileSet.clear();
	}
	
};

/**
 * Given a MapState and TileKey, fill in a Rect with the pixel coordinates
 * of the tile for the current state.
 * This assumes rectangular display.  For rotation, this will all need to
 * be reworked.
 * @param mapState
 * @param tile
 */
function setTileBounds(mapState, tile) {
	var size=tile.sel.tileSize,
		tileKey=tile.tileKey,
		scaledSize=Math.round(size * tileKey.res / mapState.res),
		left=mapState.prjToDspX(tileKey.scaledX * tileKey.res) - mapState.x,
		top=mapState.prjToDspY(tileKey.scaledY * tileKey.res) - mapState.y;
		
	tile.setBounds(left, top, scaledSize, scaledSize);
}

/**
 * Uniquely identified a tile from a given TileSelector and contains
 * discreet vital fields needed to make rendering decisions about a tile.
 * Upon construction, the id field is computed as a string from the
 * tuple (level,tileX,tileY) and can be used as an object key.
 * <p>
 * The fields level,tileX,tileY uniquely identitfy the tile.  The
 * fields res, scaledX, scaledY, size are used to make rendering
 * decisions.
 * <p>
 * The choice of using scaledX,scaledY instead of raw units was not
 * necessarily a good one.  It potentially saves one multiple/divide
 * on render, but introduces complexity.  It is retained in this port
 * for consistency.
 */
function CartesianTileKey(level, tileX, tileY, res, scaledX, scaledY, size) {
	this.id=tileX+','+tileY+'@'+level;
	this.level=level;
	this.tileX=tileX;
	this.tileY=tileY;
	this.res=res;
	this.scaledX=scaledX;
	this.scaledY=scaledY;
	this.size=size;
}

/**
 * A renderable tile, identified by tileKey.  In the JavaScript/HTML port,
 * the "drawable" is always an HTML element (in android, it is a Drawable).
 * Note that it is not necessarily an img.  It may be a composite such as
 * a canvas or a div in cases where a preview is generated from multiple
 * bits of source material.
 */
function Tile(sel, tileKey) {
	this.sel=sel;
	this.tileKey=tileKey;
	this.drawable=null;
	this.parent=null;
	this.left=null;
	this.top=null;
	this.width=null;
	this.height=null;
	this.mark=false;
}
Tile.prototype={
	_commitBounds: function(drawable) {
		drawable.style.position='absolute';
		drawable.style.left=this.left+'px';
		drawable.style.top=this.top+'px';
		drawable.style.width=this.width+'px';
		drawable.style.height=this.height+'px';
	},
	
	/**
	 * Sets a new drawable.  If the tile is rendered, then
	 * it will be directly updated in the display hierarchy.
	 */
	update: function(drawable) {
		var orig=this.drawable;
		this.drawable=drawable;
		// If we're not rendered, just set it
		if (this.parent) {
			// Otherwise, do some gyrations
			this._commitBounds(drawable);
			if (orig) {
				this.parent.replaceChild(drawable, orig);
			} else {
				this.parent.appendChild(drawable);
			}
		}
		
		// Get rid of old
		if (orig) {
			this.sel.destroyDrawable(tile, orig);
		}
	},
	
	setBounds: function(left, top, width, height) {
		var drawable=this.drawable;
		this.left=left;
		this.top=top;
		this.width=width;
		this.height=height;
		if (drawable) this._commitBounds(drawable);
	},
	
	/**
	 * Attach the tile to the display
	 */
	attach: function(parent) {
		var drawable=this.drawable;
		
		if (this.parent && parent!==this.parent) {
			// Reparent (doesn't happen but being complete)
			this.detach();
		}
		this.parent=parent;
		
		if (drawable) {
			this._commitBounds(drawable);
			if (!drawable.parentNode) parent.appendChild(drawable);
		}
	},
	
	/**
	 * Remove a tile from the view
	 */
	detach: function() {
		var drawable=this.drawable;
		this.parent=null;
		if (drawable&&drawable.parentNode) {
			drawable.parentNode.removeChild(drawable);
		}
	},
	
	dispose: function() {
		this.detach();
		if (this.drawable) {
			this.sel.destroyDrawable(this, this.drawable);
			this.drawable=null;
		}
		this.sel.destroyTile(this);
	}
};


/**
 * Maintains a set of Tile instances that are locked in some way.
 * The rendering process typically consists of visiting tiles in a set,
 * marking as it goes and then sweeping unmarked tiles.
 */
function TileSet() {
	/**
	 * Content object keyed by TileKey.id with values of Tile
	 */
	this._c={};
}
TileSet.prototype={
	each: function(callback) {
		var c=this._c, k;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				callback(c[k]);
			}
		}
	},
	
	/**
	 * Reset all marks on contained tiles to false
	 */
	resetMarks: function() {
		this.each(function(tile) {
			tile.mark=false;
		});
	},
	
	get: function(tileKey) {
		return this._c[tileKey.id];
	},
	
	add: function(tile) {
		this._c[tile.tileKey.id]=tile;
	},
	
	/**
	 * Sweep unmarked tiles into the targetTileSet,
	 * optionally invoking tileCallback(tile) for each
	 * tile transferred
	 */
	sweep: function(targetTileSet, tileCallback) {
		var c=this._c, ary=[], k, tile;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				if (!tile.mark) {
					if (targetTileSet) {
						targetTileSet.add(tile);
					} else {
						tile.dispose();
					}
					if (tileCallback) tileCallback(tile);
					ary.push(k);
				}
			}
		}
		
		for (k=0; k<ary.length; k++) {
			delete c[ary[k]];
		}
	},
	
	/**
	 * Dispose of all tiles and clear
	 */
	clear: function() {
		var c=this._c, ary=[], k, tile;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				tile.dispose();
			}
		}
		this._c={};
	}
};

// Exports
nanomaps.CartesianTileSelector=CartesianTileSelector;
//nanomaps.CanvasTileLayer=CanvasTileLayer;
nanomaps.TileLayer=TileLayer;

