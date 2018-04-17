#include <time.h>
int numTests = 1000;
int iteration = 0;
// int results[100];
struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

void seqAsync(int, int);
void parAsync(int, int);
int syncJS(int, int);
int syncJSCond(int, int);
void writeResults();
int emptyJS();
void startLoggerTest();
void syncRoundTrip();
void syncCallTime();
void loggerTime();
void asyncCallTimeParallel();
void broadcastTest();
void syncCondCallTime();

jsync int cSyncReturn() {
	return 0;
}

jasync cAsyncReturn() {
	return;
}

void asyncCallTimeSequencial() {
	clock_gettime(clk_id, &tp);
	seqAsync(tp.tv_sec, tp.tv_nsec);
}


jasync asyncDone() {
	iteration++;
	if(iteration < numTests) {
		asyncCallTimeSequencial();
	} else {
		asyncCallTimeParallel();
	}
}


void asyncCallTimeParallel() {
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		parAsync(tp.tv_sec, tp.tv_nsec);
	}
}

jasync asyncDone2() {
	syncCallTime();
}


void syncCallTime() {
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		syncJS(tp.tv_sec, tp.tv_nsec);
	}
	syncCondCallTime();
}

void syncCondCallTime() {
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		syncJSCond(tp.tv_sec, tp.tv_nsec);
	}
	syncRoundTrip();
}

void syncRoundTrip() {
	struct timespec start, stop;
	double accum;
	int delay;
	FILE *f = fopen("syncRound.txt", "w");
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &start);

		emptyJS();

		clock_gettime(clk_id, &stop);
		delay = stop.tv_nsec - start.tv_nsec;
		// accum = ( stop.tv_sec - start.tv_sec )
	 //          + ( stop.tv_nsec - start.tv_nsec )
	 //            / 1000000000L;
	    // fprintf(f, "%f\n", accum);
	    fprintf(f, "%i\n", delay);
	}
	fclose(f);
	loggerTime();
}

void loggerTime() {
	struct timespec sleepValue;
   	sleepValue.tv_sec = 0;
   	sleepValue.tv_nsec = 100000000L;
	startLoggerTest();
	char buf[50];
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		snprintf(buf, 50, "%lu%09lu", tp.tv_sec, tp.tv_nsec);
		logTime = buf;
	//	usleep(100);
	}

}

jasync broadcastStarter() {
	int count = 0;
	char* lastVal;
	char* curVal;
	char buf[50];
	char *ptr;
	broadcastTest();

	FILE *f = fopen("broadcast.txt", "w");
	while(1) {
		curVal = broadcastTime;
		if(curVal != lastVal) {
			clock_gettime(clk_id, &tp);
			snprintf(buf, 50, "%lu%09lu", tp.tv_sec, tp.tv_nsec);

	   		fprintf(f, "%lu\n", strtol(buf, &ptr, 10) - strtol(curVal, &ptr, 10));

			lastVal = curVal;
			count++;
			if(count == numTests) {
				break;
			}
		}
	}
	fclose(f);

	writeResults();
}


void main() {

	asyncCallTimeSequencial();
}
