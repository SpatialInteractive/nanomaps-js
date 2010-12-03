#include <stdio.h>
#include <proj_api.h>
#include <math.h>

typedef struct {
	const char *init_string;
	const char *name;
} projection_t;

const projection_t PROJECTIONS[] = {
	{ 
		.init_string = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs",
		.name = "WebMercator"
	}
};

typedef struct {
	double x;
	double y;
} point_t;

const point_t TEST_POINTS[] = {
	{ 1.0 * RAD_TO_DEG, 1.0 * RAD_TO_DEG },
	{ 0, 0 },
	{ 0, 45 },
	{ 0, 85 },
	{ 0, -85 },
	{ 180, 0 },
	{ -180, 0 },
	{ 45, 45 }
};

void process_projection(const projection_t *prj)
{
	
	projPJ pj_tgt, pj_latlong;
	const point_t *test_point;
	int i;
	double x,y;
	double x1,y1;
	
	pj_tgt=pj_init_plus(prj->init_string);
	pj_latlong=pj_init_plus("+proj=latlong +ellps=WGS84");
	
	if (!pj_latlong) {
		printf("could not init latlong\n");
		exit(1);
	}
	if (!pj_tgt) {
		printf("could not init target projection: %s\n", prj->init_string);
		exit(1);
	}
	
	printf("\tdescribe '%s'\n", prj->name);
	for (i=0; i<(sizeof(TEST_POINTS) / sizeof(point_t)); i++) {
		test_point=TEST_POINTS+i;
		x=test_point->x * DEG_TO_RAD;
		y=test_point->y * DEG_TO_RAD;
		
		pj_transform(pj_latlong, pj_tgt, 1, 1, &x, &y, 0);
		
		printf("\t\tit 'should forward transform (%f, %f) to (%f,%f)'\n", test_point->x, test_point->y, x, y);
		printf("\t\t\txy=Projections.%s.forward({x: %.20f, y: %.20f})\n", prj->name, test_point->x, test_point->y);
		printf("\t\t\txy.x.should.equal_approximately %.20f\n", x);
		printf("\t\t\txy.y.should.equal_approximately %.20f\n", y);
		printf("\t\tend\n\n");
		
		
		x1=x;
		y1=y;
		pj_transform(pj_tgt, pj_latlong, 1, 1, &x1, &y1, 0);
		x1*=RAD_TO_DEG;
		y1*=RAD_TO_DEG;
		
		printf("\t\tit 'should inverse transform (%f, %f) to (%f,%f)'\n", x, y, x1, y1);
		printf("\t\t\txy=Projections.%s.inverse({x: %.20f, y: %.20f})\n", prj->name, x, y);
		printf("\t\t\txy.x.should.equal_approximately %.20f\n", x1);
		printf("\t\t\txy.y.should.equal_approximately %.20f\n", y1);
		printf("\t\tend\n\n");
	}
	
	printf("\tend\n\n");
}

int main(int argc, char** argv)
{
	int i;
	
	printf("describe 'Projections'\n");
	printf("\tbefore_each\n");
	printf("\t\tProjections=nanocore.Projections\n");
	printf("\tend\n\n");
	
	for (i=0; i<(sizeof(PROJECTIONS)/sizeof(projection_t)); i++) {
		process_projection(PROJECTIONS+i);
	}
	
	printf("end\n");
	
	return 0;
}
