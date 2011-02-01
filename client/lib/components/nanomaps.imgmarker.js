/**
 * nanomaps.imgmarker.js
 * Factories for constructing HTML fragments suitable to be used
 * as markers from stock imagery
 */
(function(nanomaps) {

function makeAbsolute(baseUri, href) {
	if (href[0]==='/' || href.search(/^http(s)?\:/)>=0) return href;
	if (baseUri.match(/\/$/)) return baseUri+href;
	else return baseUri+'/'+href;
}

function hrefToClassSuffix(href) {
	var i=href.lastIndexOf('/'),
		baseName=(i>=0 ? href.substring(i+1) : href),
		m=baseName.match(/^([^_\-\.]+)/);
	return m ? m[0] : href;
}

/**
 * Primordial image marker class.  Image markers are managed according
 * to the prototype pattern.  If you have one, you can customize it into
 * a new one.  Any marker instance can be used in a call to MapSurface.attach
 * due to it fulfilling the element factory interface.
 * @public
 */
function ImgMarker(settings) {
	this.settings=new SettingsConstructor(settings);
}
/**
 * Global settings inherited for each instance
 */
ImgMarker.Settings={
	/**
	 * The img src.  If primarySuffix is not specified,
	 * then the first alpha-numeric part of this string
	 * is taken.
	 */
	src: 'orb_blue.png',
	
	/**
	 * The uri to resolve relative sources against
	 */
	baseUri: '',
	
	/**
	 * Latitude to set at creation time
	 */
	latitude: 0,
	
	/**
	 * Longitude to set at creation time
	 */
	longitude: 0,
	
	/**
	 * If set, then this is the primary css suffix.  If not set,
	 * it is derived from the src.
	 */
	 classSuffix: '',
	 
	 /**
	  * Extra css classes
	  */
	 extraClasses: ''
};

ImgMarker.prototype={
	/**
	 * Fulfill the factory pattern for map attachments.
	 * All img markers have the following structure:
	 * <pre>
	 * <div class="nmim">
	 *   <img src="{src url}" class="nmim-fg {src class}"/>
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
			fgSrc,
			classSuffix;
			
			
		// Configure fg img elt
		fgSrc=makeAbsolute(settings.baseUri||'', settings.src||'');
		classSuffix=settings.classSuffix || hrefToClassSuffix(fgSrc);
		
		outerElt.className='nmim nmim-' + classSuffix + ' ' + settings.extraClasses;
		outerElt.setAttribute('latitude', settings.latitude||0);
		outerElt.setAttribute('longitude', settings.longitude||0);
		outerElt.appendChild(fgElt);
		
		fgElt.className='nmim-fg';
		fgElt.setAttribute('src', fgSrc);
		
		return outerElt;
	}
};

/**
 * Used internally to create a new settings object with the global
 * settings as its prototype.
 * @private
 */
function SettingsConstructor(override) {
	if (override) {
		for (var k in override) {
			if (override.hasOwnProperty(k))
				this[k]=override[k];
		}
	}
}
SettingsConstructor.prototype=ImgMarker.Settings;


// Exports
nanomaps.ImgMarker=ImgMarker;

})(nanomaps);

