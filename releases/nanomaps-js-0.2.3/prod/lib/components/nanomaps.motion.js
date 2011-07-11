var STATE_DOWN=0,STATE_DRAG=1,STATE_CLICK_PEND=2,CLICK_DOUBLE_MS=280,TOUCH_THRESHOLD=10,TOUCH_LONGTAP_MS=1000,TOUCH_DOUBLE_MS=280;function MotionEvent(a){this.type=a;this.handled=false}function MotionController(u){function w(x){u.dispatchMotionEvent(x)}var o,h;function a(y){var x=u.elements.document;if(y&&!h){addEventListener(x,"mouseup",g);addEventListener(x,"mousemove",g);h=true}else{if(!y&&h){removeEventListener(x,"mouseup",g);removeEventListener(x,"mousemove",g);h=false}}}function n(x,y){k();o={b:x.button,s:STATE_DOWN,cnt:0,cs:y,cl:y,t:0,ti:null}}function l(){setTimeout(function(){if(o&&o.s===STATE_CLICK_PEND){o.ti=null;s();k()}},CLICK_DOUBLE_MS)}function j(){if(o&&o.ti){clearTimeout(o.ti)}}function s(){var x=new MotionEvent("click");x.button=o.b;x.count=o.cnt;x.x=o.cs.x;x.y=o.cs.y;w(x)}function k(){j();o=null}function g(y){if(!isLeftClick(y)){return}stopEvent(y);var z=u.eventToContainer(y),x;switch(y.type){case"mousemove":if(o.s===STATE_DOWN||o.s===STATE_DRAG){o.s=STATE_DRAG;x=new MotionEvent("drag");x.button=o.b;x.x=z.x;x.y=z.y;if(!o.cl){o.cl=o.cs}x.deltaX=o.cl.x-z.x;x.deltaY=o.cl.y-z.y;o.cl=z;w(x)}break;case"mousedown":if(o&&o.s===STATE_CLICK_PEND){if((now()-o.t)>CLICK_DOUBLE_MS){s();n(y,z)}else{o.s=STATE_DOWN;j()}}else{n(y,z)}a(true);break;case"mouseup":a(false);o.cnt++;if(o.s===STATE_DOWN){o.s=STATE_CLICK_PEND;o.t=now();l()}else{k()}break}}function q(z){stopEvent(z);k();a(false);var B,x=10,A=u.eventToContainer(z),y=new MotionEvent("scroll");if(z.wheelDelta){B=z.wheelDelta/120}else{if(z.delta){B=-z.delta/3}else{B=-z.detail/3}}B/=x;if(B>2){B=2}else{if(B<-2){B=-2}}y.x=A.x;y.y=A.y;y.deltaZoom=B/x;w(y)}var b;function m(){f();b.ti=setTimeout(function(){b.ti=null;v();d()},TOUCH_DOUBLE_MS)}function p(){f();b.ti=setTimeout(function(){if(!b||b.s!==STATE_DOWN||b.t.length!==1){return}var x=new MotionEvent("longtap");x.button=0;x.x=b.t[0].x;x.y=b.t[0].y;x.count=1;w(x);if(x.handled){d()}},TOUCH_LONGTAP_MS)}function f(){if(b){if(b.ti){clearTimeout(b.ti)}b.ti=null}}function d(){f();b=null}function v(){var x=new MotionEvent("click");x.button=0;x.count=b.cnt;x.x=b.tapX;x.y=b.tapY;w(x)}function c(x){var y=[];if(x){for(i=0;i<x.length;i++){touch=x[i];y.push(u.eventToContainer(touch))}}return y}function t(z,y){var x=new MotionEvent("drag");x.button=0;x.x=z.x;x.y=z.y;x.deltaX=y.x-z.x;x.deltaY=y.y-z.y;w(x)}function r(L,K,A,z){var J=new MotionEvent("pinch"),D=(L.x+K.x)/2,B=(L.y+K.y)/2,y=(A.x+z.x)/2,x=(A.y+z.y)/2,H=L.x-K.x,G=L.y-K.y,F=A.x-z.x,E=A.y-z.y,I=Math.sqrt(H*H+G*G),C=Math.sqrt(F*F+E*E);J.button=0;J.x=D;J.y=B;J.deltaX=y-D;J.deltaY=x-B;J.deltaZoom=Math.log(I/C)*1.5;w(J)}function e(y){var x=y.type,z;stopEvent(y);z=c(y.touches);if(x==="touchstart"){if(b&&b.s===STATE_CLICK_PEND){if((now()-b.te)>TOUCH_DOUBLE_MS){touchDispatch();d()}else{if(z.length===1){b.s=STATE_DOWN;b.t=z;f();return}}}if(!b){b={s:STATE_DOWN,t:z,mt:false,te:0,ts:now(),ti:null,cnt:0};p()}else{if(z.length>1){b.mt=true}b.t=z}return}if(!b){return}switch(y.type){case"touchmove":if(z.length===1){if(b.s===STATE_DRAG||Math.abs(z[0].x-b.t[0].x)>TOUCH_THRESHOLD||Math.abs(z[0].y-b.t[0].y)>TOUCH_THRESHOLD){f();if(b.s===STATE_CLICK_PEND){touchDispatch();b.cnt=0}b.s=STATE_DRAG;t(z[0],b.t[0]);b.t=z}}else{if(z.length>1){b.s=STATE_DRAG;r(z[0],z[1],b.t[0],b.t[1]);b.t=z}}break;case"touchend":if(!b.mt||z.length===0){if(b.s===STATE_DOWN){b.cnt++;b.s=STATE_CLICK_PEND;b.tapX=b.t[0].x;b.tapY=b.t[0].y;b.te=now();m()}else{d()}}else{b.t=z}break;case"touchcancel":d();break}}this.listen=function(x,B,E){var C=u.elements,D=C.event,z=C.parent,A=["touchstart","touchend","touchmove","touchcancel"],y;if(x){addEventListener(D,"mousedown",g)}if(E){addEventListener(D,"DOMMouseScroll",q);addEventListener(D,"mousewheel",q)}if(B&&D.addEventListener){for(y=0;y<A.length;y++){D.addEventListener(A[y],e,true)}}}}MapSurfaceMethods.advise("initialize","after",function(a){var b=new MotionController(this);this.motionController=b;b.listen(!a.noClick,!a.noTouch,!a.noWheel)});MapSurfaceMethods.dispatchMotionEvent=function(b){var a="motion."+b.type;this.emit(a,b);if(!b.handled){this.handleMotionEvent(b)}};MapSurfaceMethods.handleMotionEvent=function(b){if(b.handled){return}var c=b.type,a;if(c==="drag"||c==="pinch"){this.begin();this.moveBy(b.deltaX,-b.deltaY);a=Number(b.deltaZoom);if(!isNaN(a)){this.setZoom(this.getZoom()+a,b.x,b.y)}this.commit();b.handled=true}else{if(c==="scroll"){this.setZoom(this.getZoom()+b.deltaZoom,b.x,b.y);b.handled=true}else{if(c==="click"&&b.count===2){this.begin();this.zoomIn(b.x,b.y);this.commit(true);b.handled=true}}}};