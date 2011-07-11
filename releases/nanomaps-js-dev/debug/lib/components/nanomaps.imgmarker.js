/**
 * nanomaps.imgmarker.js
 * Factories for constructing HTML fragments suitable to be used
 * as markers from stock imagery
 */
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
	this.element=null;
	this.children=null;
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
	 * Location Coordinate
	 */
	location: null,
	
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
	 * By default ImgMarker instances are attached to the 'overlay' layer
	 * @public
	 * @name defaultLayer
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	defaultLayer: 'overlay',

	/**
	 * Update the latitude/longitude settings.  If the marker is attached,
	 * make the updates live on the map as well.
	 * @methodOf nanomaps.ImgMarker.prototype
	 * @name setLocation
	 * @param coordinate {Coordinate}
	 */
	setLocation: function(coordinate) {
		coordinate=Coordinate.from(coordinate);
		var settings=this.settings,
			element=this.element,
			owner=this.owner;
		settings.location=coordinate;
		if (element) {
			if (coordinate) {
				element.geo={
					latitude: coordinate.lat(),
					longitude: coordinate.lng()
				};
			} else {
				element.geo=null;
			}
			if (owner&&element.parentNode) {
				owner.update(element);
			}
		}
	},
	
	/**
	 * (Attachment Api) Get the element that should be attached
	 * to the map.
	 * <pre>
	 * <div class="nmim">
	 *   <img src="{src url}" class="nmim-fg {src class}"/>
	 * </div>
	 * </pre>
	 * A background will only be specified if setup in the properties.  In addition,
	 * the actual dom element returned will have its "geo" object set so that
	 * the default map delegate can position it appropriately.
	 * @public
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	getElement: function(mapSurface) {
		this.owner=mapSurface;
		if (this.element) return this.element;
		var d=mapSurface.elements.document,
			element=d.createElement('div'),
			fgElt=d.createElement('img');
		element.appendChild(fgElt);
		
		// Export
		this.element=element;
		this.children={
			fg: fgElt
		};
		
		// Apply config
		this._config();
		return element;
	},
	
	/**
	 * Apply the current configuration to the elements
	 * @private
	 * @name _config
	 * @memberOf nanomaps.ImgMarker.prototype
	 */
	_config: function() {
		var settings=this.settings,
			location=settings.location,
			element=this.element,
			fgElt=this.children.fg,
			fgSrc,
			classSuffix;
			
			
		// Configure fg img elt
		fgSrc=makeAbsolute(settings.baseUri||'', settings.src||'');
		classSuffix=settings.classSuffix || hrefToClassSuffix(fgSrc);
		
		element.className='nmim nmim-' + classSuffix + ' ' + settings.extraClasses;
		if (location) {
			element.geo={
				latitude: location.lat()||NaN,
				longitude: location.lng()||NaN
			};
		} else {
			element.geo=null;
		}
		
		fgElt.className='nmim-fg';
		fgElt.setAttribute('src', fgSrc||null);
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
exports.ImgMarker=ImgMarker;

