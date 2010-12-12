describe 'Projections'
	before_each
		Projections=nanomaps.Projections
	end

	describe 'WebMercator'
		it 'should forward transform (57.295780, 57.295780) to (6378137.000000,7820815.276085)'
			xy=Projections.WebMercator.forward(57.29577951308232286465, 57.29577951308232286465)
			xy[0].should.equal_approximately 6378137.00000000000000000000
			xy[1].should.equal_approximately 7820815.27608548197895288467
		end

		it 'should inverse transform (6378137.000000, 7820815.276085) to (57.295780,57.295780)'
			xy=Projections.WebMercator.inverse(6378137.00000000000000000000, 7820815.27608548197895288467)
			xy[0].should.equal_approximately 57.29577951308231575922
			xy[1].should.equal_approximately 57.29577951308231575922
		end

		it 'should forward transform (0.000000, 0.000000) to (0.000000,-0.000000)'
			xy=Projections.WebMercator.forward(0.00000000000000000000, 0.00000000000000000000)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately -0.00000000070811545516
		end

		it 'should inverse transform (0.000000, -0.000000) to (0.000000,0.000000)'
			xy=Projections.WebMercator.inverse(0.00000000000000000000, -0.00000000070811545516)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately 0.00000000000000000000
		end

		it 'should forward transform (0.000000, 45.000000) to (0.000000,5621521.486192)'
			xy=Projections.WebMercator.forward(0.00000000000000000000, 45.00000000000000000000)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately 5621521.48619206622242927551
		end

		it 'should inverse transform (0.000000, 5621521.486192) to (0.000000,45.000000)'
			xy=Projections.WebMercator.inverse(0.00000000000000000000, 5621521.48619206622242927551)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately 44.99999999999998578915
		end

		it 'should forward transform (0.000000, 85.000000) to (0.000000,19971868.880409)'
			xy=Projections.WebMercator.forward(0.00000000000000000000, 85.00000000000000000000)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately 19971868.88040856271982192993
		end

		it 'should inverse transform (0.000000, 19971868.880409) to (0.000000,85.000000)'
			xy=Projections.WebMercator.inverse(0.00000000000000000000, 19971868.88040856271982192993)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately 84.99999999999998578915
		end

		it 'should forward transform (0.000000, -85.000000) to (0.000000,-19971868.880409)'
			xy=Projections.WebMercator.forward(0.00000000000000000000, -85.00000000000000000000)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately -19971868.88040857017040252686
		end

		it 'should inverse transform (0.000000, -19971868.880409) to (0.000000,-85.000000)'
			xy=Projections.WebMercator.inverse(0.00000000000000000000, -19971868.88040857017040252686)
			xy[0].should.equal_approximately 0.00000000000000000000
			xy[1].should.equal_approximately -85.00000000000000000000
		end

		it 'should forward transform (180.000000, 0.000000) to (20037508.342789,-0.000000)'
			xy=Projections.WebMercator.forward(180.00000000000000000000, 0.00000000000000000000)
			xy[0].should.equal_approximately 20037508.34278924390673637390
			xy[1].should.equal_approximately -0.00000000070811545516
		end

		it 'should inverse transform (20037508.342789, -0.000000) to (180.000000,0.000000)'
			xy=Projections.WebMercator.inverse(20037508.34278924390673637390, -0.00000000070811545516)
			xy[0].should.equal_approximately 180.00000000000000000000
			xy[1].should.equal_approximately 0.00000000000000000000
		end

		it 'should forward transform (-180.000000, 0.000000) to (-20037508.342789,-0.000000)'
			xy=Projections.WebMercator.forward(-180.00000000000000000000, 0.00000000000000000000)
			xy[0].should.equal_approximately -20037508.34278924390673637390
			xy[1].should.equal_approximately -0.00000000070811545516
		end

		it 'should inverse transform (-20037508.342789, -0.000000) to (-180.000000,0.000000)'
			xy=Projections.WebMercator.inverse(-20037508.34278924390673637390, -0.00000000070811545516)
			xy[0].should.equal_approximately -180.00000000000000000000
			xy[1].should.equal_approximately 0.00000000000000000000
		end

		it 'should forward transform (45.000000, 45.000000) to (5009377.085697,5621521.486192)'
			xy=Projections.WebMercator.forward(45.00000000000000000000, 45.00000000000000000000)
			xy[0].should.equal_approximately 5009377.08569731097668409348
			xy[1].should.equal_approximately 5621521.48619206622242927551
		end

		it 'should inverse transform (5009377.085697, 5621521.486192) to (45.000000,45.000000)'
			xy=Projections.WebMercator.inverse(5009377.08569731097668409348, 5621521.48619206622242927551)
			xy[0].should.equal_approximately 45.00000000000000000000
			xy[1].should.equal_approximately 44.99999999999998578915
		end

	end

end
