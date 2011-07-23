// Spectrum - a drop-in colorpicker
// Brian Grinstead
// MIT License

(function($) {

window.spectrum = spectrum;
jQuery.fn.spectrum = function(options) {
    return this.each(function() {
    	spectrum(this, options);
    });
};

function spectrum(element, o) {
	var opts = $.extend({ }, spectrum.defaultOptions, o);
	if ($(element).hasClass("spectrum-input")) {
		return;
	}
	
	// Required DOM objects
	var $element = $(element).addClass("spectrum-input");
	var spec = $(templates.container).insertAfter(element);
	var placeholder = $(templates.placeholder).insertAfter(element).offset($element.offset());
	var done = spec.find(".spectrum-done");
	var overlay = spec.find(".spectrum-overlay");
	var hue = spec.find(".spectrum-hue");
	var doc = element.ownerDocument || document;
	var colorSelect = spec.find(".color-select");
	var hueSelect = spec.find(".hue-select");
	
	var OVERLAY_WIDTH = overlay.width();
	var OVERLAY_HEIGHT = overlay.height();
	var HUE_WIDTH = hue.width();
	var HUE_HEIGHT = hue.height();
	
	// State properties
	var shown = false;
	var currentColor;
	var currentColorStr;
	var initialColor = $(element).val();
	
	var hasCanvas = opts.useCanvas && supportsCanvas(doc);
	var overlayCanvas, hueCanvas;
	if (hasCanvas) {
		overlayCanvas = createCanvasForContainer(overlay[0]);
		createCanvasOverlay(overlayCanvas, "green");
		overlay.append(overlayCanvas);
		
		hueCanvas = createCanvasForContainer(hue[0]);
		createCanvasHue(hueCanvas);
		hue.append(hueCanvas);
		
	}
	
	overlay.toggleClass("no-canvas", !hasCanvas);
	
	spec.bind({
		"click": stopPropagation,
		"spectrum.hide": spectrumHide,
		"spectrum.show": spectrumShow,
		"spectrum._select": spectrumSelect,
		"spectrum.move": spectrumMove,
		"spectrum.choose": spectrumChoose,
		"spectrum.color": spectrumColor
	});
	
	draggable(overlay, overlayDrag);
	draggable(hue, hueDrag);
	
	spec.delegate(
		".spectrum-done", "click", doneClick
	);
	
	placeholder.click(placeholderClick);
	
	spec.trigger("spectrum.choose", initialColor);
	
	function placeholderClick(e) {
		spec.trigger(shown ? "spectrum.hide" : "spectrum.show");
		e.stopPropagation();
	}
	
	function doneClick() {
		spec.trigger("spectrum._select");
		placeholder.trigger("click");
	}
	
	var overlayX = overlayY = 0;
	function overlayDrag(e) {
		overlayX = Math.max(0,Math.min(OVERLAY_WIDTH - 1,(e.dragX)));
		overlayY = Math.max(0,Math.min(OVERLAY_HEIGHT - 1,(e.dragY)));
		
		colorSelect.css({top: overlayY, left: overlayX });
		var color = getColorFromCoords(overlayX, overlayY);
		spec.trigger("spectrum.move", color);
	}
	
	var hueX = hueY = 0;
	function hueDrag(e) {
		hueX = Math.max(0,Math.min(HUE_WIDTH - 1,(e.dragX)));
		hueY = Math.max(0,Math.min(HUE_HEIGHT - 1,(e.dragY)));
		
		hueSelect.css({top: hueY, left: 0 });
		var h = setHueFromCoords(hueX, hueY);
		var c = getColorFromCoords(overlayX, overlayY);
		
		spec.trigger("spectrum.move", c);
	}
	
	function setHueFromCoords(x, y) {
		var data = hueCanvas.getContext("2d").getImageData(x, y, 1, 1).data;
		var color = tinycolor({r: data[0], g: data[1], b: data[2] }).toHexCss();
		
		createCanvasOverlay(overlayCanvas, color);
	}
	function getColorFromCoords(x, y) {
		var data = overlayCanvas.getContext("2d").getImageData(x, y, 1, 1).data;
		var color = tinycolor({r: data[0], g: data[1], b: data[2] }).toHexCss();
		
		return color;
	}
	
	function spectrumSelect() {
		if (currentColor) {
		    var hex = currentColor.toHexCss();
		    placeholder.css("background-color", hex);
		    overlay.css("background-color", hex);
		}
	}
	
	function spectrumChoose(e, color, preventSelect) {
		currentColorStr = color;
		currentColor = tinycolor(color);
		log("here", currentColor, currentColor.toHexCss())
		var h = currentColor.toHsv().h;
		hueSelect.css({top: (HUE_HEIGHT - (HUE_HEIGHT * h)), left: 0 });
		
		if (!preventSelect) {
		    spec.trigger("spectrum._select");
		}
	}
	
	function spectrumMove(e, color) {
		spec.trigger("spectrum.choose", [color, !opts.selectOnMove]);
	}
	
	function spectrumColor() {
		return currentColor;
	}
	
	function spectrumHide() {
		spec.removeClass("show");
		shown = false;
		$(element.ownerDocument).unbind("click", _triggerHide);
	}
	
	function spectrumShow() {
		var offset = placeholder.offset();
		offset.left += placeholder.outerWidth(true);
		spec.css({ top: offset.top, left: offset.left}).addClass("show");
		shown = true;
		$(element.ownerDocument).bind("click", _triggerHide);
	}
	
	function _triggerHide() {
		spec.trigger("spectrum.hide");
	}
};


spectrum.defaultOptions = {
	selectOnMove: true,
	useCanvas: true
};

var templates = {
	placeholder: "<div class='spectrum-placeholder'></div>",
	container: 
	"<div class='spectrum'>" +
		"<div class='spectrum-overlay spectrum-noselect'>" +
			"<div class='color-select'></div>" +
		"</div>" + 
		"<div class='spectrum-hue spectrum-noselect'>" +
			"<div class='hue-select'></div>" +
		"</div>" +
		"<div class='spectrum-controls'>" +
			"<div class='old-color remember-color'></div>" + 
			"<div class='new-color remember-color'></div>" +
			"<button class='spectrum-done'>ok</button>" +
		"</div>" +  
		"<br style='clear:both;' />" +
		"<input class='enter-color' placeholder='Name, Hex, or RGB' />" +
	"</div>"
};


function createCanvasForContainer(container) {
	var c = container.ownerDocument.createElement("canvas");
	c.width = $(container).width();
	c.height = $(container).height();
	return c;
}
function createCanvasHue(c) {
	if (c.getContext) {
		var width = c.width = c.width;
		var height = c.height = c.height;
		var ctx = c.getContext("2d");
		
		var imgData = ctx.getImageData(0,0,width,height);
		var index = 0;
		var hue = 0.0;
		var sat = 1;
		var x,y;    
		for(y = height-1; y >=0; y--){
		   hue = y / height;
		   hue = (hue - Math.floor(hue));
		   var rgb = tinycolor({h:hue, s:sat, v: 1}).toRgb();
		   for(x = 0; x < width; x++){
		      imgData.data[index++]  = rgb.r;
		      imgData.data[index++]  = rgb.g;
		      imgData.data[index++]  = rgb.b;
		      imgData.data[index++]  = 255;
		   }
		}
		
		ctx.putImageData(imgData,0,0);
		
		//$(container).empty().append(c);
		//$(container).css("background-image", "url("+c.toDataURL("image/png")+")");
		return c;
	}
	
	return false;
};

function createCanvasOverlay(c, color) {
	if (c.getContext) {
		var width = c.width = c.width;
		var height = c.height = c.height;
		var ctx = c.getContext("2d");
		
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, width, height);
		
		var white = ctx.createLinearGradient(0, 0, width, 0);
		white.addColorStop(0,'white');
		white.addColorStop(1,'transparent');
		ctx.fillStyle = white;
		ctx.fillRect(0, 0, width, height);
		
		var black = ctx.createLinearGradient(0, height, 0, 0);
		black.addColorStop(0,'black');
		black.addColorStop(1,'transparent');
		ctx.fillStyle = black;
		ctx.fillRect(0, 0, width, height);
		
		//$(container).css("background-image", "url("+c.toDataURL("image/png")+")");
		return c;
	}
	return false;
}


function stopPropagation(e) { 
	e.stopPropagation(); 
}
function supportsCanvas(doc) {
	return doc.createElement("canvas").getContext;
}

function draggable(element, onmove, onstart, onstop) {
	onmove = onmove || function() { };
	onstart = onstart || function() { };
	onstop = onstop || function() { };
	
	var doc = element.ownerDocument || document;
	var dragging = false;
	var offset = { };
	function move(e) { 
		if (dragging) {
			e.dragX = e.pageX - offset.left;
			e.dragY = e.pageY - offset.top;
			onmove.apply(element, [e]); 
		} 
	}
	function start() { 
		if (!dragging) { 
			offset = $(element).offset();
			$(doc).bind({ 
				"mouseup": stop,
				"mousemove": move
			});
			onstart.apply(element, arguments); 
		} 
		dragging = true; 
	}
	function stop() { 
		if (dragging) { 
			$(doc).unbind("mouseup", stop);
			onstop.apply(element, arguments); 
		}
		dragging = false; 
	}
	
	$(element).bind("mousedown", start);
}	

function log(){ if(console) { console.log( Array.prototype.slice.call(arguments) ); } }

// TinyColor.js - https://github.com/bgrins/TinyColor - 2011 Brian Grinstead - v0.1
var tinycolor=function(){function u(a){var c=g=b=255;if(typeof a=="string"){a=a.replace(v,"").replace(w,"").toLowerCase();n[a]&&(a=n[a]);for(var d=0;d<o.length;d++){var e=o[d].process,h=o[d].re.exec(a);h&&(channels=e(h),c=channels[0],g=channels[1],b=channels[2])}}else if(typeof a=="object"){if(a.hasOwnProperty("r"))c=a.r,g=a.g,b=a.b;if(a.hasOwnProperty("h")&&a.hasOwnProperty("s")&&a.hasOwnProperty("v"))d=r(a.h,a.s,a.v),c=d.r,g=d.g,b=d.b;if(a.hasOwnProperty("h")&&a.hasOwnProperty("s")&&a.hasOwnProperty("l"))d=
s(a.h,a.s,a.l),c=d.r,g=d.g,b=d.b}return{r:Math.min(255,Math.max(parseInt(c,10),0)),g:Math.min(255,Math.max(parseInt(g,10),0)),b:Math.min(255,Math.max(parseInt(b,10),0))}}function t(a,c,d){a/=255;c/=255;d/=255;var e=Math.max(a,c,d),h=Math.min(a,c,d),f,j=(e+h)/2;if(e==h)f=h=0;else{var i=e-h;h=j>0.5?i/(2-e-h):i/(e+h);switch(e){case a:f=(c-d)/i+(c<d?6:0);break;case c:f=(d-a)/i+2;break;case d:f=(a-c)/i+4}f/=6}return{h:f,s:h,l:j}}function l(a,c){a=parseFloat(a);if(a==c)return 1;else if(a>1)return a%c/parseFloat(c);
return a}function s(a,c,d){function e(a,d,c){c<0&&(c+=1);c>1&&(c-=1);if(c<1/6)return a+(d-a)*6*c;if(c<0.5)return d;if(c<2/3)return a+(d-a)*(2/3-c)*6;return a}a=l(a,360);c=l(c,100);d=l(d,100);if(c==0)d=c=a=d;else{var h=d<0.5?d*(1+c):d+c-d*c,f=2*d-h;d=e(f,h,a+1/3);c=e(f,h,a);a=e(f,h,a-1/3)}return{r:d*255,g:c*255,b:a*255}}function r(a,c,d){var e,h,f;a=l(a,360);c=l(c,100);d=l(d,100);var j=Math.floor(a*6),i=a*6-j;a=d*(1-c);var p=d*(1-i*c);c=d*(1-(1-i)*c);switch(j%6){case 0:e=d;h=c;f=a;break;case 1:e=p;
h=d;f=a;break;case 2:e=a;h=d;f=c;break;case 3:e=a;h=p;f=d;break;case 4:e=c;h=a;f=d;break;case 5:e=d,h=a,f=p}return{r:e*255,g:h*255,b:f*255}}function q(a,c,d){function e(a){return a.length==1?"0"+a:a}return[e(a.toString(16)),e(c.toString(16)),e(d.toString(16))].join("")}var k=function(a){if(typeof a=="object"&&a.hasOwnProperty("_tc_id"))return a;a=u(a);var c=a.r,d=a.g,e=a.b;return{_tc_id:x++,toHsv:function(){var a=c,f=d,j=e;a/=255;f/=255;j/=255;var i=Math.max(a,f,j),l=Math.min(a,f,j),m,k=i-l;if(i==
l)m=0;else{switch(i){case a:m=(f-j)/k+(f<j?6:0);break;case f:m=(j-a)/k+2;break;case j:m=(a-f)/k+4}m/=6}return{h:m,s:i==0?0:k/i,v:i}},toHsl:function(){return t(c,d,e)},toHslCss:function(){var a=t(c,d,e);return"hsl("+Math.round(a.h*360)+", "+Math.round(a.s*100)+"%, "+Math.round(a.l*100)+"%)"},toHex:function(){return q(c,d,e)},toHexCss:function(){return"#"+q(c,d,e)},toRgb:function(){return{r:c,g:d,b:e}},toRgbCss:function(){return"rgb("+c+", "+d+", "+e+")"},toName:function(){var a=q(c,d,e),f;for(f in n)if(n[f]==
a)return f;return!1}}};k.version="0.1";k.equals=function(a,c){return k(a).toHex()==k(c).toHex()};var v=/^[\s,#]+/,w=/\s+$/,x=0,n={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",
darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dodgerblue:"1e90ff",feldspar:"d19275",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",
fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",grey:"808080",green:"00ff00",greenyellow:"adff2f",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgrey:"d3d3d3",lightgreen:"90ee90",lightpink:"ffb6c1",lightsalmon:"ffa07a",
lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslateblue:"8470ff",lightslategray:"778899",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"00ff00",limegreen:"32cd32",linen:"faf0e6",magenta:"ff00ff",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370d8",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",
navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"d87093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",red:"ff0000",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",
silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",violetred:"d02090",wheat:"f5deb3",white:"ffffff",whitesmoke:"f5f5f5",yellow:"ffff00",yellowgreen:"9acd32"},o=[{re:/^rgb\s*\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,process:function(a){return[parseInt(a[1]),parseInt(a[2]),parseInt(a[3])]}},{re:/^rgb\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/,
process:function(a){return[parseInt(a[1]),parseInt(a[2]),parseInt(a[3])]}},{re:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,process:function(a){return[parseInt(a[1],16),parseInt(a[2],16),parseInt(a[3],16)]}},{re:/^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,process:function(a){return[parseInt(a[1]+a[1],16),parseInt(a[2]+a[2],16),parseInt(a[3]+a[3],16)]}},{re:/^hsl\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/,process:function(a){a=s(a[1],a[2],a[3]);return[a.r,a.g,a.b]}},{re:/^hsv\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/,
process:function(a){a=r(a[1],a[2],a[3]);return[a.r,a.g,a.b]}}];return k}();

})(jQuery);