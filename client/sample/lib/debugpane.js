(function() {
	var paneTimeout;
	function showDebugMessage(msg) {
		var dv=$('#debugpane');
		if (!dv.get(0)) {
			dv=$(document.createElement('div'));
			dv.get(0).id='debugpane';
			dv.appendTo(document.body);
		} else {
			dv.append('<br>');
		}
		dv.append(msg);
		
		if (paneTimeout) clearTimeout(paneTimeout);
		paneTimeout=setTimeout(function() {
			paneTimeout=null;
			dv.remove();
		}, 5000);
		dv.click(function() {
			dv.remove();
		});
	}
	window.showDebugMessage=showDebugMessage;
	console.log=showDebugMessage;
})();

