#include <time.h>

int numTests = 1000;
int iteration = 0;
struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

void timing(int, int);


void asyncCallTimeSequencial() {
	clock_gettime(clk_id, &tp);
	timing(tp.tv_sec, tp.tv_nsec);
}

jasync asyncDone() {

	iteration++;
	if(iteration < numTests) {
		asyncCallTimeSequencial();
	} 
}


void main() {
	iteration = 0;
	asyncCallTimeSequencial();
}

  
