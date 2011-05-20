var testMapElement;
var testMap;
var TILESRC_MAP="http://otile${modulo:1,2,3}.mqcdn.com/tiles/1.0.0/osm/${level}/${tileX}/${tileY}.png";


function _bootPage() {
	testMapElement=document.getElementById('testMap');
	if (testMapElement) testMapElement.style.display='block';
	
	window.onresize=function() {
		if (testMap) testMap.setSize();
	};
	window.onerror=function(errorMsg, url, lineNumber) {
		// An extra alert should trigger test problems
		setTimeout(function() {
			alert('JavaScript error (' + url + ':' + lineNumber + '): ' + errorMsg);
		}, 100);
		return true;
	};
	
	try {
		initializePage();
	} catch (e) {
		setTimeout(function() {
			alert('Error during page boot ' + e);
		}, 100);
	}
}


