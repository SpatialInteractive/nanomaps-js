(function(e){var d=100;var c=e.MapSurface.prototype;function b(k,j,h){var l=k._mouseState,i=k.eventToContainer(h),g,f;switch(j){case"down":a(k);l.s="down";l.start=i;if(!l.ccount){l.ccount=0}if(l.clickTimer){clearTimeout(l.clickTimer);l.clickTimer=null}break;case"up":if(l.s=="down"){l.ccount+=1;if(l.clickTimer){clearTimeout(l.clickTimer);l.clickTimer=null}if(l.ccount>1){l.ccount=0;f=Math.ceil(k.getLevel()+0.1);k.setLevel(f,i)}else{l.clickTimer=setTimeout(function(){l.clickTimer=null;l.ccount=0},d)}}a(k);break;case"move":if(l.s==="down"||l.s==="drag"){l.s="drag";if(!l.last){l.last=l.start}g=l.last.x-i.x;f=l.last.y-i.y;l.last=i;k.moveBy(g,-f)}break}}function a(f){var g=f._mouseState;g.s=null;g.start=null;g.last=null}c.ondom_mousedown=function(f){b(this,"down",f);f.preventDefault()};c.ondom_mouseup=function(f){if(!this._mouseState.s){return}b(this,"up",f);f.preventDefault()};c.ondom_mousemove=function(f){if(!this._mouseState.s){return}b(this,"move",f);f.preventDefault()};c.ondom_mousewheel=function(g){a(this);g.preventDefault();var j,f=10,i=Math.round(this.getLevel()*f)/f,h=map.eventToContainer(g);if(g.wheelDelta){j=g.wheelDelta/120}else{if(g.delta){j=-g.delta/3}else{j=-g.detail/3}}this.setLevel(i+j/10,h)};c.advise("initialize","after",function(f){this._mouseState={};this.routeDomEvent("mousedown",null,"glass");this.routeDomEvent("mouseup",null,"document");this.routeDomEvent("mousemove",null,"document");if(!f.disableMouseWheel){this.routeDomEvent("DOMMouseScroll","dom_mousewheel","glass");this.routeDomEvent("mousewheel",null,"glass")}this.elements.viewport.style.cursor="move"})})(nanomaps);