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
		
		var testMap=this.testMap=new nanomaps.MapSurface(this.mapElt, {
			center: { lat: 39.74, lng: -104.99 },
			resolution: 611
		});
		//testMap.attach(nanomaps.createStdTileLayer());
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
	
	it 'should report the correct latitude for points offset vertically'
		var centLat=39.74,
			topLat=this.testMap.toLatLng(this.testMap.width/2, 0).lat,
			botLat=this.testMap.toLatLng(this.testMap.width/2, 399).lat;
		topLat.should.be_greater_than centLat
		topLat.should.equal_approximately 40.57, 2e-2
		
		botLat.should.be_less_than centLat
		botLat.should.equal_approximately 38.89, 2e-2
	end
	
	it 'should report the correct longitude for points offset horizontally'
		var centLng=-104.99,
			leftLng=this.testMap.toLatLng(0, this.testMap.height/2).lng,
			rightLng=this.testMap.toLatLng(599, this.testMap.height/2).lng;
		
		leftLng.should.be_less_than centLng
		leftLng.should.equal_approximately -106.63, 2e-2
		
		rightLng.should.be_greater_than centLng
		rightLng.should.equal_approximately -103.34, 2e-2
	end
	
	it 'should have toSurface and fromSurface transforms that are inverse'
		var lngLat=this.testMap.transform.fromSurface(-300,-200);
			// Note: accessing transform directly bypasses offset shift
			// in global map layer.  Coordinates are off of center point
			// of zpx
		
		// Sanity checks
		lngLat[0].should.equal_approximately -106.63, 2e-2
		lngLat[1].should.equal_approximately 40.57, 2e-2
		
		var px=this.testMap.transform.toSurface(lngLat[0], lngLat[1]);
		px[0].should.equal_approximately -300
		px[1].should.equal_approximately -200
	end
	
	it 'should move east with positive easting pixels'
		var origCenter=this.testMap.getCenter();
		this.testMap.moveBy(100, 0);
		var newCenter=this.testMap.getCenter();
		
		newCenter.lat.should.equal_approximately origCenter.lat
		newCenter.lng.should.be_greater_than origCenter.lng
	end

	it 'should move west with negative easting pixels'
		var origCenter=this.testMap.getCenter();
		this.testMap.moveBy(-100, 0);
		var newCenter=this.testMap.getCenter();
		
		newCenter.lat.should.equal_approximately origCenter.lat
		newCenter.lng.should.be_less_than origCenter.lng
	end
	
	it 'should move north with positive northing pixels'
		var origCenter=this.testMap.getCenter();
		this.testMap.moveBy(0, 100);
		var newCenter=this.testMap.getCenter();
		
		newCenter.lng.should.equal_approximately origCenter.lng
		newCenter.lat.should.be_greater_than origCenter.lat
	end
	
	it 'should move south with negative northing pixels'
		var origCenter=this.testMap.getCenter();
		this.testMap.moveBy(0, -100);
		var newCenter=this.testMap.getCenter();
		
		newCenter.lng.should.equal_approximately origCenter.lng
		newCenter.lat.should.be_less_than origCenter.lat
	end
	
	it 'should retain geometry after changing center'
		this.testMap.setCenter({lat: 35, lng: -110});
		
		var calcCenter=this.testMap.toLatLng(this.testMap.width/2, this.testMap.height/2);
		calcCenter.lat.should.equal_approximately 35, 1e-1
		calcCenter.lng.should.equal_approximately -110, 1e-1
	end
end

