/**
 * nanomaps.imgmarker.js
 * Factories for constructing HTML fragments suitable to be used
 * as markers from stock imagery
 */
(function(nanomaps) {

/**
 * Primordial image marker class.  Image markers are managed according
 * to the prototype pattern.  If you have one, you can customize it into
 * a new one.  Any marker instance can be used in a call to MapSurface.attach
 * due to it fulfilling the element factory interface.
 */
function ImgMarker(options) {
}
ImgMarker.prototype={
	/**
	 * Fulfill the factory pattern for map attachments.
	 * All img markers have the following structure:
	 * <pre>
	 * <div class="nmim {alignment classes}">
	 *   <img src="{src url}" width="{width}" height="{height}" class="nmim-fg"/>
	 *   <img src="{background url}" ... class="nmim-bg" />
	 * </div>
	 * </pre>
	 * A background will only be specified if setup in the properties.  In addition,
	 * the actual dom element returned will have its "geo" object set so that
	 * the default map delegate can position it appropriately.
	 */
	createElement: function(mapSurface) {
		var d=mapSurface.elements.document,
			settings=this.settings,
			outerElt=d.createElement('div'),
			fgElt=d.createElement('img'),
			geo={};
			
		outerElt.className='nmim';
		outerElt.appendChild(fgElt);
		outerElt.geo=geo;
		
		// Configure fg img elt
		fgElt.className='nmim-fg';
		fgElt.setAttribute('width', _width(settings));
		fgElt.setAttribute('height', _height(settings));
		fgElt.setAttribute('src', _src(settings));
		
		
		// Set geo properties
		geo.latitude=_latitude(settings);
		geo.longitude=_longitude(settings);
		geo.xoffset=_alignXOffset(settings);
		geo.yoffset=_alignYOffset(settings);
		
		return outerElt;
	}
};
	
})(nanomaps);

