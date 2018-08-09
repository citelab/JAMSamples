#include <time.h>
#define NUMTESTS 1000

struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;


void loggerTime() {
	struct timespec sleepValue;
   	sleepValue.tv_sec = 0;
   	sleepValue.tv_nsec = 100000000L;

	char buf[50];
	for (int i = 0; i < NUMTESTS; i++) {
		clock_gettime(clk_id, &tp);
		snprintf(buf, 50, "%lu%09lu", tp.tv_sec, tp.tv_nsec);
		logTime = buf;

		usleep(100000);
	}

}

void main() {
	loggerTime();
}
