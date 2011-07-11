/**
 * nanomaps.tiles.js
 * Provide an "image mosaic" tile layer that can be attach()'d to
 * a MapSurface.  The original version of this module served as the
 * basis for the android version, where further inspiration was had
 * and was then ported back to this version.
 * See the net.rcode.nanomaps.tile package.
**/

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
 * @param {Number} [options.pixelRatio=1.0] The ratio of tilepixel / csspixel
 * @param {Number} [options.autoPixelRatio=false] If no pixelRatio is given consult the browser to determine native ratio
 * all sides of the map
 */
function TileLayer(options) {
	if (!options) options={};
	/**
	 * The TileLayerPeer object
	 * @name peer
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var peer=this.peer=new TileLayerPeer();
	var sel=peer.sel=new CartesianTileSelector(options);
	
	/**
	 * Ratio of tilePixel / cssPixel.  This will be 1.0 on most displays.
	 * On high density displays, setting this to 2.0 may result in better
	 * visual clarity.
	 * @name pixelRatio
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var explicitPixelRatio=Number(options.pixelRatio);
	if (!explicitPixelRatio && options.autoPixelRatio) {
		explicitPixelRatio=window.devicePixelRatio;
	}
	
	/**
	 * Ratio of tilePixel / cssPixel.  This will be 1.0 on most displays.
	 * On high density displays, setting this to 2.0 may result in better
	 * visual clarity.
	 * @name pixelRatio
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	sel.pixelRatio=peer.pixelRatio=this.pixelRatio=explicitPixelRatio||1.0;
	
	/**
	 * The element that is the root of the TileLayer
	 * @name element
	 * @public
	 * @memberOf nanomaps.TileLayer#
	 */
	var element=this.element=document.createElement('div');
	element.style.position='absolute';
	element.style.left='0px';
	element.style.top='0px';
	if (explicitPixelRatio) {
		element.style.zoom=(1/explicitPixelRatio);
	}
	element.mapeer=peer;
	element.setAttribute('tilesrc', sel.toString());	// For DOM debugging
}
TileLayer.prototype={
	/**
	 * (Attachment Api) Tile layers are unmanaged attachments
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	unmanaged: true,
	
	/**
	 * (Attachment Api) Default attachment layer is 'map'.
	 * For touch support it is imperitive that the map layer
	 * is below the event layer because touch state will be lost
	 * if the event ever attaches to nodes that are removed
	 * are the target of a touch event.
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	defaultLayer: 'map',

	/**
	 * (Attachment Api) Get the element that should be attached
	 * to the map.
	 * @public
	 * @memberOf nanomaps.TileLayer.prototype
	 */
	getElement: function(mapSurface) {
		/**
		 * When a TileLayer has been attached to a map, its owner
		 * property is the owning MapSurface
		 * @public
		 * @memberOf nanomaps.TileLayer#
		 */
		this.owner=mapSurface;
		return this.element;
	}
};

/**
 * Peer object for TileLayers
 * @private
 * @name nanomaps.TileLayerPeer
 * @constructor
 */
function TileLayerPeer() {
	// TileSets
	this.lockedState=null;
	this.current=new TileSet();
	this.old=new TileSet();
	this.transition=new TileSet();
}
TileLayerPeer.prototype={
	/**
	 * @private
	 */
	maposition: function(map, element) {
		this.mareset(map, element);
	},
	
	/**
	 * Populates the transition TileSet with tiles for the given mapState.
	 * A lot of this code is semi-duplicated in onreset but with minor twists
	 * and I've not been able to condense them into one without breaking things.
	 * @private
	 */
	loadPendingTiles: function(mapState) {
		var transitionTileSet=this.transition,
			currentTileSet=this.current,
			pixelRatio=this.pixelRatio,
			right=pixelRatio * (mapState.w-1),
			bottom=pixelRatio * (mapState.h-1),
			updatedKeys,
			i,
			key,
			tile,
			newTiles=[];
		
		//console.log('Loading pending tiles for target state ' + mapState.res);
		
		transitionTileSet.clear();
		// Select tiles that intersect our display area
		updatedKeys=this.sel.select(mapState.prj,
			mapState.res / pixelRatio,
			mapState.getPrjX(0,0),
			mapState.getPrjY(0,0),
			mapState.getPrjX(right,bottom),
			mapState.getPrjY(right,bottom));
		
		// Match them up against what we are already displaying
		for (i=0; i<updatedKeys.length; i++) {
			key=updatedKeys[i];
			tile=currentTileSet.move(key, transitionTileSet);
			if (!tile) {
				// We only create a new transitional tile if the tile isn't
				// on the current display
				tile=new Tile(this.sel, key);
				transitionTileSet.add(tile);
				newTiles.push(tile);
				setTileBounds(mapState, tile, pixelRatio);
			}
		}
		
		// Sort and load
		sortTiles(newTiles, pixelRatio*mapState.w/2, pixelRatio*mapState.h/2);
		for (i=0; i<newTiles.length; i++) {
			tile=newTiles[i];
			// Load the tiles but don't generate previews because
			// no other tilesets are referenced to the same display.
			// We'll need to generate previews when we actually go
			// to use them later
			tile.loading=true;
			this.sel.loadTile(tile, null, true);
		}
	},
	
	/**
	 * TODO: Port transition parts back in later
	 * @private
	 */
	mareset: function(map, element) {
		var currentTileSet=this.current,
			transitionTileSet=this.transition,
			oldTileSet=this.old,
			mapState=map.mapState,
			lockedState=this.lockedState,
			pixelRatio=this.pixelRatio,
			right=pixelRatio*(mapState.w-1),
			bottom=pixelRatio*(mapState.h-1),
			updatedKeys,
			i,
			key,
			tile,
			newTiles=[];
		
		if (lockedState!==mapState.finalState) {
			// Handle transition and detransition
			lockedState=this.lockedState=mapState.finalState;

			// Dump pending tiles into current for consideration in the main loop
			//console.log('Transitional end state changed: Sweeping tiles to current');
			//transitionTileSet.sweep(currentTileSet);
			//console.log('Tiles swept to current');
			
			if (lockedState) {
				// Load tiles for a new final state
				this.loadPendingTiles(lockedState);
			}
		}
		
		//console.log('TileLayer.onreset(transition locked=' + (!!lockedState) + ')');
		currentTileSet.resetMarks();
		
		// Select tiles that intersect our display area
		updatedKeys=this.sel.select(mapState.prj,
			mapState.res / pixelRatio,
			mapState.getPrjX(0,0),
			mapState.getPrjY(0,0),
			mapState.getPrjX(right,bottom),
			mapState.getPrjY(right,bottom));

		// Match them up against what we are already displaying
		for (i=0; i<updatedKeys.length; i++) {
			key=updatedKeys[i];
			tile=currentTileSet.get(key) || transitionTileSet.move(key, currentTileSet);

			// If we're not in a transitional state.
			// If the tile is marked temporary, then disregard it
			// because we don't want half rendered crap anymore.
			// Just the good stuff for us from here on out.
			if (!lockedState && tile && tile.temporary) tile=null;

			// Still no tile?  Create one.
			if (!tile) {
				tile=new Tile(this.sel, key);
				if (lockedState) tile.temporary=true;
				currentTileSet.add(tile);
			}
			tile.mark=true;
			
			setTileBounds(mapState, tile, pixelRatio);

			// After a transition we may be dealing with a child that
			// was loaded without ever being attached.  Fix that now.
			if (!tile.parent) {
				// Not yet added to display.  Put it in the list
				// to be fixed up as a new tile
				newTiles.push(tile);
			}
		}
		
		// If we are generating previews, then we need to sweep
		// no longer used tiles into the oldTileSet and update their
		// display metrics so that the new tiles can use them for
		// previews
		if (newTiles.length>0) {
			currentTileSet.sweep(oldTileSet, function(tile) {
				setTileBounds(mapState, tile, pixelRatio);
			});
		}
		
		// newTileRecords now contains all records that have been newly allocated.
		// We initialize them here in this ass-backwards way because we want to sort
		// them by proximity to the center but don't have the display information until
		// after we've iterated over all of them.  Think of this as the "initialize new
		// tiles" loop
		sortTiles(newTiles, pixelRatio * mapState.w/2, pixelRatio * mapState.h/2);
		for (i=0; i<newTiles.length; i++) {
			tile=newTiles[i];
			
			// Order is important here.  The tile may have a drawable
			// set within the call to loadTile, in which case don't do
			// the work to generate a preview
			if (!tile.loading && !tile.temporary) {
				tile.loading=true;
				this.sel.loadTile(tile);
			}
			if (!tile.drawable) {
				tile.generatePreview(oldTileSet);
			}
			tile.attach(element);
		}
		
		currentTileSet.sweep();
		oldTileSet.sweep();
		if (!lockedState) transitionTileSet.clear();
	}
	
};

/**
 * Sort tiles based on their center coordinate's proximity to
 * some reference coordinate.  The idea is that we are trying to
 * load tiles near the center before tiles on the edges.
 */
function sortTiles(tilesAry, x, y) {
	tilesAry.sort(function(tile1, tile2) {
		var score1=Math.abs(tile1.left+tile1.width/2 - x) + Math.abs(tile1.top+tile1.height/2 - y),
			score2=Math.abs(tile2.left+tile2.width/2 - x) + Math.abs(tile2.top+tile2.height/2 - y);
		return score1 - score2;
	});
}

/**
 * Given a MapState and TileKey, fill in a Rect with the pixel coordinates
 * of the tile for the current state.
 * This assumes rectangular display.  For rotation, this will all need to
 * be reworked.
 * @param mapState
 * @param tile
 */
function setTileBounds(mapState, tile, pixelRatio) {
	var size=tile.sel.tileSize,
		tileKey=tile.tileKey,
		scaledSize=pixelRatio * Math.ceil(size * tileKey.res / mapState.res),
		left=pixelRatio * Math.floor(mapState.prjToDspX(tileKey.scaledX * tileKey.res) - mapState.x),
		top=pixelRatio * Math.floor(mapState.prjToDspY(tileKey.scaledY * tileKey.res) - mapState.y);
		
	tile.setBounds(left, top, scaledSize, scaledSize);
}

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
	
	// Pending tile records, keyed by tile.tileKey.id:
	// {
	//		tile: the owning tile
	//		src: image source
	// 		img: DOM image element
	//		loaded: true|false
	//		time: utc millis on load, load ms on finish
	// }
	this.pending={};
}
CartesianTileSelector.prototype={
	toString: function() {
		return this.srcSpec;
	},
	
	_sched: function(pended) {
		var self=this, 
			id=pended.tile.tileKey.id,
			img=pended.img;
		img.onload=function() {
			pended.loaded=true;
			finish();
			
			if (pended.tile) {
				pended.tile.update(img);
			}
		};
		img.onerror=function() {
			finish();
		};
		
		function finish() {
			pended.time=now()-pended.time;
			delete self.pending[id];
			//console.log('Tile loaded(' + pended.tile.tileKey.id + ') in ' + pended.time + 'ms: ' + pended.src); 
		}
		
		// And away we go
		self.pending[id]=pended;
		img.src=pended.src;
	},
	
	loadTile: function(tile) {
		var pended={
			tile: tile,
			src: this.resolveSrc(tile.tileKey),// + '?' + now(),
			img: document.createElement('img'),
			loaded: false,
			time: now()
		};
		
		//console.log('Load tile ' + tile.tileKey.level + '@' + tile.tileKey.tileX + ',' + tile.tileKey.tileY);
		this._sched(pended);
	},

	destroyTile: function(tile) {
		var id=tile.tileKey.id;
		var pended=this.pending[id];
		if (pended && pended.tile===tile) {
			//console.log('Destroy tile ' + id);
			delete this.pending[id];
			// This is rumoured to cancel loading the
			// image in some browsers
			pended.img.src='data:image/png,';
		}
	},
	
	destroyDrawable: function(tile, drawable) {
		// TODO Not sure we need to do anything here
	},
	
	/**
	 * Get an img src from the tileDesc
	 * @public
	 * @name resolveSrc
	 * @methodOf nanomaps.TileSelector.prototype
	 * @param {TileKey} TileKey returned from select
	 */
	resolveSrc: function(tileKey) {
		var self=this;
		return self.srcSpec.replace(/\$\{([A-Za-z]+)(\:([^\}]*))?\}/g, function(s, name, ignore, args) {
			if (name==='quadkey') {
				return tileXYToQuadkey(tileKey.tileX, tileKey.tileY, tileKey.level);
			} else if (name==='modulo') {
				// get the args and modulo it by the tileDesc.tileX
				args=args.split(/\,/);
				return args[tileKey.tileX%args.length];
			} else if (name==='pixelRatio') {
				return self.pixelRatio || 1.0;
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
	this.temporary=false;
	this.loading=false;
}
Tile.prototype={
	_commitBounds: function(drawable) {
		/*
		if (this.width!==this.tileKey.size || this.height!==this.tileKey.size) {
			console.log('TileSize round error: (' + this.left + ',' + this.top + ') -> (' + this.width + ',' + this.height + ')');
		}
		*/
		
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
		drawable.setAttribute('tileid', this.tileKey.id);
		
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
			this.sel.destroyDrawable(this, orig);
		}
	},
	
	setBounds: function(left, top, width, height) {
		var drawable=this.drawable;
		this.left=parseInt(left);
		this.top=parseInt(top);
		this.width=parseInt(width);
		this.height=parseInt(height);
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
	},
	
	/**
	 * Generate a preview Drawable for this tile from material in the
	 * source TileSet.  This assumes that this tile's bounds are updated
	 * to current display bounds and all tiles in the tileSet are also
	 * updated.  If a preview could be generated it's drawable will be
	 * set
	 */
	generatePreview: function(tileSet) {
		var self=this,
			preview=null;
		
		tileSet.intersect(self, function(srcTile) {
			if (!preview) {
				try {
					preview=new TileCompositor(self);
				} catch (e) {
					// Will throw an exception if the browser
					// doesn't support canvas.  Oh well.
					// Uncomment to see reall error.
				}
			}
			
			if (preview) preview.add(srcTile);
		});
		
		if (preview) {
			self.update(preview.drawable);
		}
	}
};

function TileCompositor(tile) {
	var canvas=document.createElement('canvas'),
		ctx;
	canvas.width=tile.width;
	canvas.height=tile.height;
	ctx=canvas.getContext('2d');
	
	// Uncomment to see the drawn boxes
	//ctx.fillStyle='rgb(200,0,0)';
	//ctx.fillRect(2,2,canvas.width-2,canvas.height-2);
	
	// - exports
	this.drawable=canvas;
	this.add=function(blitTile) {
		var dx=blitTile.left-tile.left, dy=blitTile.top-tile.top,
			sx=0, sy=0,
			sw, sh,
			overflow,
			w=blitTile.width,
			h=blitTile.height,
			blitScaleX=blitTile.tileKey.size / blitTile.width, 
			blitScaleY=blitTile.tileKey.size / blitTile.height;
		
		if (dx<0) {
			// Clip left
			sx=-dx;
			dx=0;
			w-=sx;
		}
		if (dy<0) {
			// Clip top
			sy=-dy;
			dy=0;
			h-=sy;
		}
		
		// Clip right
		overflow=dx+w-tile.width;
		if (overflow>=0) {
			w-=overflow;
		}
		
		// Clip bottom
		overflow=dy+h-tile.height;
		if (overflow>=0) {
			h-=overflow;
		}
		
		// Source coordinates have been figured according to the current display
		// but the drawImage call works on original image dimensions.
		// Therefore, scale the source coordinates
		sx*=blitScaleX;
		sy*=blitScaleY;
		sw=w*blitScaleX;
		sh=h*blitScaleY;
		
		//console.log('drawImage(' + sx + ',' + sy + ',' + sw + ',' + sh + ',' + dx + ',' + dy + ',' + w + ',' + h + ')');
		try {
			ctx.drawImage(blitTile.drawable,
				sx, sy,
				sw, sh,
				dx, dy,
				w, h);
		} catch (e) {
			// There are boundary conditions due to rounding where
			// some coordinates may be out of bounds.  These will be
			// for tiles just outside of the bounds and we're just
			// going to let the system catch it and not lose any
			// sleep about it
			//console.log('Exception in call to drawImage(' + sx + ',' + sy + ',' + sw + ',' + sh + ',' + dx + ',' + dy + ',' + w + ',' + h + ')');
		}
	};
}

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
		var id=tile.tileKey.id, c=this._c;
		var existing=c[id];
		if (existing) {
			existing.dispose();
		}
		c[id]=tile;
	},
	
	move: function(tileKey, destTileSet) {
		var id=tileKey.id, c=this._c,
			existing=c[id];
		if (existing) {
			delete c[id];
			destTileSet.add(existing);
		}
		return existing;
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
	},
	
	/**
	 * Select all tiles whose bounds intersect the bounds of the
	 * given tile and have a drawable.
	 */
	intersect: function(srcTile, callback) {
		var c=this._c, k, tile,
			minx=srcTile.left, miny=srcTile.top,
			maxx=minx+srcTile.width, maxy=miny+srcTile.height;
		for (k in c) {
			if (c.hasOwnProperty(k)) {
				tile=c[k];
				if (tile.drawable && !(
						tile.left>=maxx ||
						(tile.left+tile.width)<minx ||
						tile.top>=maxy ||
						(tile.top+tile.height)<miny
					))
				{
					// Intersects
					callback(tile);
				}
			}			
		}
	}
};

// Exports
nanomaps.CartesianTileSelector=CartesianTileSelector;
nanomaps.TileLayer=TileLayer;

