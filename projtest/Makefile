run: projtest
	./projtest | tee ../client/test/spec.autoprojections.js
	
projtest: projtest.c
	$(CC) $(CPPFLAGS) $(LDFLAGS) -o projtest projtest.c -lproj
	
clean:
	rm projtest

