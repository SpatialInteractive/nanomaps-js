Nanomaps
========
Nanomaps is a small JavaScript library for displaying no-frills slippy maps
on click and touch devices.

Demo: http://stellaeof.github.com/nanomaps/demo/demo.html
Api Docs: http://stellaeof.github.com/nanomaps/apidocs

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

Status
------
This project is very young and I am developing it in tandem with a product I am
building out.  It works on "modern browsers" out of the box and I expect a minor
effort to support IE7 and 8.  Due to a design decision in the way that z-indexing
is handled, the project will never support the broken z-index model of IE7 and
below.  Most simple maps will not have a problem with this as the natural stacking
order is probably what is desired anyway, but fine stacking control will not be
available in this ancient browser.

Touch devices are also targeted for full support but only the iPhone is supported/tested
at present.

License
=======
Copyright (c) 2010 Stella Laurenzo, http://stella.laurenzo.org

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

