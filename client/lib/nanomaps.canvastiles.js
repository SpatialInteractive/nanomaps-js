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
	options=options||{};
	this.sel=new TileSelector(options);
}
CanvasTileLayer.prototype={
	unmanaged: true,

	createElement: function(map) {
		var screen=map.createElement('canvas');
		screen.style.position='absolute';
		screen.style.left='0px';
		screen.style.top='0px';
		screen.invalid=true;
		screen.mapDelegate=this;
		
		return screen;
	},
	
	/**
	 * Checks that the current canvas geometry matches the map.  If not,
	 * this will reset it and schedule a redraw.  Proper usage:
	 *  if (!checkGeom(map, screen)) return;
	 */
	checkGeom: function(map, screen) {
		if (!screen.invalid && map.width===screen.width && map.height===screen.height) return true;
		
		// Reset (clears canvas)
		screen.width=map.width;
		screen.height=map.height;
		screen.invalid=false;
		
		this.buffer=document.createElement('canvas');
		this.buffer.width=map.width;
		this.buffer.height=map.height;
		
		this.invalidate(map, screen, 0, 0, screen.width, screen.height);
		
		return false;
	},
	
	/**
	 * Invalidates a portion of the screen.
	 */
	invalidate: function(map, screen, x, y, width, height) {
		var self=this,
			tiles,
			transform=map.transform,
			sel=this.sel,
			globalXY=map.toGlobalPixels(0, 0),
			i;
		
		console.log('screen invalidate (' + x + ',' + y + ') -> (' + width + ',' + height + ')');
		tiles=sel.select(transform.prj, transform.res, globalXY.x, globalXY.y, width, height, true);
		//console.log('got ' + tiles.length + ' tiles');
		
		// Store the current canvas extent in global coordinates
		screen.mapRes=transform.res;
		screen.mapX=globalXY.x;
		screen.mapY=globalXY.y;
		
		for (i=0; i<tiles.length; i++) {
			processTile(tiles[i]);
		}
		
		// free memory from closures
		tiles=null;

		// aux function
		function processTile(tileDesc) {
			self.loadImage(map, sel.resolveSrc(tileDesc), function(image) {
				var context=screen.getContext('2d'),
					scaleFactor=tileDesc.res / screen.mapRes,
					globalX=screen.mapX,
					globalY=screen.mapY,
					srcSize=tileDesc.size,
					sx, sy, sw, sh,
					dx=Math.round(tileDesc.x*scaleFactor - globalX),
					dy=Math.round(globalY - tileDesc.y*scaleFactor),	// y-axis inversion
					dw=Math.ceil(srcSize*scaleFactor),
					dh=dw,
					ow, oh;
				
				// Clip left side
				if (dx>=0) {
					// Non-negative dx.  Left side completely visible.
					sx=0;
					sw=srcSize;
				} else {
					// Negative dx (clipped off left edge)
					dw=dw+dx;
					sx=-dx/scaleFactor;
					dx=0;
					sw=srcSize - sx;
				}
				
				// Clip top side
				if (dy>=0) {
					// Non-negative dy.  Top side completely visible
					sy=0;
					sh=srcSize;
				} else {
					// Negative dy (clipped off top edge)
					dh=dh+dy;
					sy=-dy/scaleFactor;
					dy=0;
					sh=srcSize-sy;
				}
				
				// Clip right side
				ow=screen.width-(dx+dw);
				if (ow<0) {
					dw+=ow;
					sw+=ow/scaleFactor;
				}
				
				// Clip bottom side
				oh=screen.height-(dy+dh);
				if (oh<0) {
					dh+=oh;
					sh+=oh/scaleFactor;
				}
				
				if (dh>0 && dw>0) {
					//console.log('blit tile: (' + [sx,sy,sw,sh,dx,dy,dw,dh].join(',') + ')');
					context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
					/*
					context.strokeRect(dx, dy, dw, dh);
					context.font='bold 16px sans-serif';
					context.textBaseline='middle';
					context.textAlign='center';
					context.fillText(tileDesc.key, dx+dw/2, dy+dh/2);
					*/
				}
			});
		}
	},
	
	loadImage: function(map, url, callback) {
		var img=map.createElement('img');
		img.onload=function() {
			callback(img);
		};
		img.src=url;
	},
	
	onreset: function(map, screen) {
		if (!this.checkGeom(map, screen)) return;
		
		console.log('onreset: level=' + map.getLevel());
		this.invalidate(0,0,screen.width,screen.height);
	},
	
	onposition: function(map, screen) {
		if (!this.checkGeom(map, screen)) return;

		var self=this,
			transform=map.transform,
			curXY=map.toGlobalPixels(0, 0),
			context,
			deltaX=Math.round(curXY.x - screen.mapX),
			deltaY=Math.round(screen.mapY - curXY.y),	// y-axis inversion
			copyWidth=screen.width-Math.abs(deltaX), 
			copyHeight=screen.height-Math.abs(deltaY),
			cx, cy,
			sx, sy,
			dx, dy;
		
		if (copyWidth>0 && copyHeight>0) {
			// Copy-Invalidate.
			// Invalidation areas:
			//   - Positive deltaX/deltaY: Invalidate right/bottom.
			//   - Negative deltaX/deltaY: Invalidate left/top
			//console.log('Copy-Invalidate: deltaXY=(' + deltaX + ',' + deltaY + ')');
			
			if (deltaX>0) {
				dx=0;
				sx=deltaX;
				cx=screen.width-sx;
			} else {
				dx=-deltaX;
				sx=0;
				cx=0;
			}
			
			if (deltaY>0) {
				dy=0;
				sy=deltaY;
				cy=screen.height-sy;
			} else {
				dy=-deltaY;
				sy=0;
				cy=0;
			}
			
			// Store the current canvas extent in global coordinates
			screen.mapRes=transform.res;
			screen.mapX=curXY.x;
			screen.mapY=curXY.y;

			context=screen.getContext('2d');
			context.globalCompositeOperation='copy';
			context.clearRect(cx, 0, Math.abs(deltaX), screen.height);
			context.clearRect(0, cy, screen.width, Math.abs(deltaY));
			context.drawImage(screen, sx, sy, copyWidth, copyHeight, dx, dy, copyWidth, copyHeight);

			this.invalidate(map, screen, cx, 0, Math.abs(deltaX), screen.height);
			this.invalidate(map, screen, 0, cy, screen.width, Math.abs(deltaY));
			
			/*
			console.log('Copy-Invalidate: (' +
			[sx,sy,copyWidth,copyHeight,dx,dy].join(',') + ') -> (' + [cx,cy].join(',') + '), (' + [deltaX,deltaY].join(',') + ')');
			*/
		} else {
			// Complete invalidate
			this.invalidate(map, screen, 0,0,screen.width,screen.height);
		}
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

