describe 'MapGeometry'
	before_each
		var mapElt=this.mapElt=document.createElement('div');
		mapElt.style.width='600px';
		mapElt.style.height='400px';
		mapElt.style.position='absolute';
		mapElt.style.right='0px';
		mapElt.style.top='0px';
		mapElt.style.backgroundColor='gray';
		document.body.appendChild(mapElt);
		
		var testMap=this.testMap=new nanocore.MapSurface(this.mapElt, {
			center: { lat: 39.74, lng: -104.99 },
			resolution: 611
		});
		//testMap.attach(nanocore.createStdTileLayer());
	end
	
	after_each
		document.body.removeChild(this.mapElt);
		delete this.mapElt;
		delete this.testMap;
	end
	
	it 'should report the correct initial center and resolution'
		this.testMap.getCenter().lat.should.equal_approximately 39.74
		this.testMap.getCenter().lng.should.equal_approximately -104.99
		this.testMap.getResolution().should.equal 611
		this.testMap.getLevel().should.equal_approximately 8.00, 2e-2
	end
	
	
end

