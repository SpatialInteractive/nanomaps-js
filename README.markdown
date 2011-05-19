Nanomaps
========
Nanomaps is a small JavaScript library for displaying no-frills slippy maps
on click and touch devices.

Release 0.2.0
-------------
Links:

* Demo (prod): http://www.rcode.net/nanomaps/nanomaps-js-0.2.1/prod/
* Demo (debug): http://www.rcode.net/nanomaps/nanomaps-js-0.2.1/debug/
* Api Docs: http://www.rcode.net/nanomaps/nanomaps-js-0.2.1/apidocs/
* Download: http://www.rcode.net/nanomaps/nanomaps-js-0.2.1.tar.gz

Combined javascript file is in either the prod (compressed) or debug (uncompressed)
directory under lib/nanomaps.bundle.all.js

See below for release notes.

Niche
-----
This project really doesn't compete with OpenLayers, Google Maps v3 or any of the
other "full" map apis.  Each of these apis offers a full "web cartographic display"
solution (for lack of a better word) and insulates the developer heavily from the
knowledge that they are in fact on a web page, doing htmly things for the rest
of the site.

Nanomaps aims to be different in that it provides a thin veneer over the DOM,
just enough to handle geographic positioning and event handling.  It presumes
that you will be bringing your own tools for manipulating the content that
you put on and around the map and is really just there to manage the map surface.

This project will provide a number of add-on libraries (which are intended to more
be examples than library code) illustrating higher level concepts like markers,
shapes, info windows, etc.

In exchange for this minimalism, you get to add maps to your pages for just a
handful of kilobytes of JavaScript.

Quick Start
-----------
Once you have a map, the "attach" method can be used to add either raw HTML
elements or "factory object" (of which a TileLayer is one) directly to the map.
In order to position properly, elements must have "latitude" and "longitude"
attributes.  The element will be maintained on the map with its upper left corner
at the given coordinates.  Use standard CSS techniques to reposition (ie. margin
or padding) to match the tail of the icon.

When a map is constructed, any positioned elements (having a latitude and longitude attribute)
are positioned onto the map (due to a bug, they also need a z-index for the moment).
Non-positioned elements remain in the container and map content is added before them
in the DOM.
	
	<style>
		#map {
			width: 640px;
			height: 480px;
		}
		
		#mapcopy {
			z-index: 50;
			position: absolute;
			right: 2px; bottom: 2px;
			text-align: right;
			font-family: sans-serif;
			font-size: 10px;
			-webkit-user-select:none;
			-moz-user-select:none;
			cursor: default;
		}
		#mapcopy a:visited {
			color: #00f;
		}
		
		.poi {
			z-index: 100;
			margin-left: -10px;
			margin-top: -32px;
			display: none;	/* make not displayed by default to avoid startup flicker */
		}
	</style>

	<div id="mymap">
		<img class="poi" src="images/red-pushpin.png" latitude="39.780533" longitude="-104.988896" />
		
		<span>Tiles Courtesy of <a href="http://open.mapquest.co.uk/" target="_blank">MapQuest</a> <img width="16" height="16" src="http://developer.mapquest.com/content/osm/mq_logo.png" border="0"></span>
		<br />
		<span>&copy; <a href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a></span>
	</div>
	
	<script>
		var map=new nanomaps.MapSurface(document.getElementById("mymap"));
		map.attach(new nanomaps.TileLayer({ 
		   tileSrc: "http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png" }));
	</script>	

Roadmap
=======
My company is targeting release of two products in the next 60 days which will have components that make use of both
nanomaps (JavaScript) and nanomaps-droid.  Expect relative completion of each along that same timeline.
	
Change Log
==========

Release 0.2.1
-------------
Snapshot of current work.

* Implemented begin()/commit()/rollback() for batching map interactions together with
a single display update
* Added animation support to commit() method so that batched map updates can be
animated with arbitrary timings and curves
* Reworked tiling to fully take advantage of animation.  Tiles are prefetched for the final
MapState at the beginning of an animation, increasing the chances that no perceivable load
time elapses
* Added zoomIn() / zoomOut() methods to work with integral zoom levels instead of floating point
* Added simple geocoding to demo
* Still has some touch issues on Android webkit.  Also geolocation not working and geocoding failing.
* Size is 9.31KB over the wire

Release 0.2.0
-------------
This is a snapshot of recent refactorings and has received minimal testing.  Key updates:

* Backported API structure and many concepts from nanomaps-droid (https://github.com/stellaeof/nanomaps-droid)
* Rewrote much of tiling code so that transitions across native zoom levels retain previews
* Added concept of indexed layers and surfaces instead of one flat bucket for attachments
* Started new demo page

Upcoming changes:

* I'm still not happy with the api abstraction for markers.  The ImgMarker uses a factory pattern which I like whereas
the SvgMarker/EllipseMarker use a single instance per attachment.  I like bits of both but they are both awkward to
program.  I'm going to noodle on it and try some different styles before proceeding to build out more marker types.
* Touch state gets out of sync on my android phone after a few zooms.  More work needs to be done here.
* Support panning and zooming simultaneously in multi-touch
* Animated transitions
* Experiment with a scaled event layer for intercepting touch events.  iPhone on the retina display *seems*
to deliver approximately twice the granularity of touch events if the target div is at native resolution vs scale
which allows much smoother scrolling

Release 0.1.0
-------------

* This project is very young and I am developing it in tandem with a product I am
building out.  It works on "modern browsers" out of the box and I expect a minor
effort to support IE7 and 8.  Due to a design decision in the way that z-indexing
is handled, the project will never support the broken z-index model of IE7 and
below.  Most simple maps will not have a problem with this as the natural stacking
order is probably what is desired anyway, but fine stacking control will not be
available in this ancient browser.

* Touch devices are also targeted for full support but only the iPhone is supported/tested
at present.

License
=======
Copyright (c) 2011 Stella Laurenzo, http://stella.laurenzo.org

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

