/**
 * nanomaps.infowindow.js
 * Basic infowindow library.
 */
 
/**
 * An InfoWindow is a map attachment that is anchored to a specific
 * place on the map, displays some custom content and typically has
 * some kind of visual pointer that physically points to the mapped
 * location.  In all other ways, it is just HTML with CSS styling
 * to provide the desired look and feel.  The InfoWindow class is provided
 * to ease the management of these windows according to typical usage
 * patterns by providing the following features (while otherwise
 * leaving you to bring your own html and css):
 * <ul>
 * <li>Create shell dom structure
 * <li>Position the window within the viewport
 * <li>Position the pointer within the window
 * <li>Support enumeration/manipulating of all open windows on the map
 * </ul>
 * 
 * <h3>Design</h3>
 * Most of the actual details of the InfoWindow are handled by a delegate
 * object passed in at construction time.  This will default to DefaultInfoWindowDelegate
 * if not specified.
 * 
 * <h3>Attribution</h3>
 * Inspiration for some of the default styling presented here was
 * derived from <a href="http://google-maps-utility-library-v3.googlecode.com/svn/trunk/infobubble/examples/example.html">google-maps-utility-library-v3</a>.
 * 
 * <h3>Default Styling</h3>
 * The following styling block works with the default infowindow settings
 * <pre>
 *	.nmiw {
 *		padding: 4px 15px 4px 15px;
 *		background: -webkit-gradient(linear,left top,left bottom,color-stop(0, #707070),color-stop(0.51, #5E5E5E),color-stop(0.52, #393939));
 *		background: -moz-linear-gradient(center top,#707070 0%,#5E5E5E 51%,#393939 52%);
 *	
 *		border-color: #2C2C2C;
 *		border-style: solid;
 *		border-width: 1px;
 *		border-top-left-radius: 4px 4px;
 *		border-top-right-radius: 4px 4px;
 *		border-bottom-right-radius: 4px 4px;
 *		border-bottom-left-radius: 4px 4px;
 *		opacity: 0.95;
 *	}
 *	
 *	.nmiw-content {
 *		font-family: Helvetica-Neue, Helvetica, arial, sans-serif;
 *		font-size: 18px;
 *		line-height: 25px;
 *		text-shadow: 0 -1px 0 black;	
 *		font-weight: bold;
 *		color: #fff;
 *	}
 *	
 *	.nmiw-pointer {
 *		position: absolute;
 *		bottom: -15px;
 *		width: 0px;
 *		height: 0px;
 *		margin-left: -16px;
 *		border-top: 15px solid #393939;
 *		border-left: 15px solid transparent;
 *		border-right: 15px solid transparent;
 *	}
 * </pre>
 * @constructor
 * @public
 * @name nanomaps.InfoWindow
 */
function InfoWindow(options) {
	if (!options) options={};
	this.options=options;
	
	// -- Instantiate the delegate
	var delegateCtor=options.delegate||InfoWindowDelegate,
		delegate,
		state,
		element;
	if (isFunction(delegateCtor)) 
		delegate=new delegateCtor(options);
	else
		delegate=delegateCtor;
	
	this.delegate=delegate;
	
	// -- Set up the state object
	element=this.element=delegate.init();
	
	// -- The peer is the delegate
	element.mapeer=delegate;
}

InfoWindow.prototype={
	// -- Attachment API
	defaultLayer: 'foreground',
	getElement: function(mapSurface) {
		var owner=this.owner;
		// Change owner
		this.owner=mapSurface;
		return this.element;
	},
	
	setLocation: function(coordinate, offset) {
		var element=this.element,
			owner=this.owner;
		element.macoord=coordinate && Coordinate.from(coordinate);
		element.maoffset=offset && Coordinate.from(offset);
		if (owner && element.parentNode) {
			// Force a reset
			owner.update(this);
		}
	},
	
	getContent: function() {
		return this.delegate.getContent(this.element);
	}
};

/**
 * Default InfoWindow delegate class.
 * @constructor
 * @public
 * @name nanomaps.InfoWindowDelegate
 */
function InfoWindowDelegate(options) {
	this.cssPrefix=options.cssPrefix||'nmiw';
	this.margin=options.margin || 25;
}
InfoWindowDelegate.prototype={
	init: function() {
		var cssPrefix=this.cssPrefix,
			element=div(),
			contentElement=div(),
			pointerElement=div();
			
		element.appendChild(contentElement);
		element.appendChild(pointerElement);
		
		element.style.position='absolute';
		pointerElement.style.position='absolute';
		
		element.className=cssPrefix;
		contentElement.className=cssPrefix + '-content';
		pointerElement.className=cssPrefix + '-pointer';
		
		// Add dom references to _outer so we can function
		// in a peer
		element._content=contentElement;
		element._pointer=pointerElement;
		
		return element;
	},
	
	mareset: function(mapSurface, element) {
		var xy=mapSurface.globalToXY(element.macoord),
			offsetXY=element.maoffset,
			left, top;
			
		if (xy) {
			left=xy.x();
			top=xy.y();
			if (offsetXY) {
				left-=offsetXY.x();
				top-=offsetXY.y();
			}
			element.style.left=left+'px';
			element.style.top=top+'px';
			element.style.display='block';
		} else {
			element.style.display='none';
		}
		if (!element._layedOut) {
			this.layout(mapSurface, element, false);
			element._layedOut=true;
		}
	},
	
	layout: function(mapSurface, element) {
		// Element (left,top) coordinates are relative to the offset
		// area (offsetWidth/offsetHeight).  In a normal configuration,
		// we expect the pointer coordinates to be relative to the client
		// area of the container, but this requires too much knowledge
		// of the specific visuals, so we instead require that the css
		// for the pointer rig it in such a way that the pointer left
		// is relative to its container left.  This will require balancing
		// content area padding/borders with negative margin on the pointer.
		// The pointer should also be pre-biased by the layout so that the
		// zero point refers to the correct center position.
		
		// First unset forced width so we can measure the natural size.
		// The make sure the width does not overflow our display area
		element.style.width='';
		var margin=this.margin,
			viewportWidth=mapSurface.mapState.w - 2*margin;
		if (element.offsetWidth>viewportWidth) {
			// Clamp the size to an allowable width
			element.style.width=(
				viewportWidth - element.offsetWidth + element.clientWidth
				) + 'px';
		}
		
		// Figure marginLeft setting needed to optimize display
		// First order of business is to measure
		// the element and determine the offsets in order
		// to position its bottom center at the origin
		var width=element.offsetWidth,
			pointer=element._pointer,
			offsetX=width/2,
			vpX=parseInt(element.style.left)+parseInt(element.parentNode.style.left)-offsetX,
			overflowX;
		
		// If we're viewport biasing, determine the element's anchor position
		// in viewport space
		overflowX=vpX-margin;
		if (overflowX<0) {
			//console.log('Overflow left: vpX=' + vpX + ', viewportWidth=' + viewportWidth + ', overflowX=' + overflowX);
			offsetX+=overflowX;
			//console.log('offsetX=' + offsetX);
		} else {
			overflowX=(vpX+width)-(viewportWidth-margin);
			if (overflowX>0) {
				//console.log('Overflow left: vpX=' + vpX + ', width=' + width + ', viewportWidth=' + viewportWidth + ', overflowX=' + overflowX);
				offsetX+=overflowX;
				//console.log('offsetX=' + offsetX);
			}
		}
		
		// Start violating the viewport margin if we don't have at least one pointer width
		// between the edge and the margin
		if (offsetX<pointer.offsetWidth) offsetX=pointer.offsetWidth;
		else if (offsetX>(width-pointer.offsetWidth)) offsetX=width-pointer.offsetWidth; 
		
		
		// Commit the coordinates
		pointer.style.left=(offsetX) + 'px';
		element.style.marginLeft=(-offsetX) + 'px';
		
		// And marginTop
		element.style.marginTop=(
			- element.offsetHeight - pointer.offsetHeight
			) + 'px';
	},
	
	getContent: function(element) {
		return element._content;
	}
};

// -- Exports
exports.InfoWindow=InfoWindow;
exports.InfoWindowDelegate=InfoWindowDelegate;

