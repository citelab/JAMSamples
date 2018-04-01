#include <time.h>
int numTests = 1000;
int iteration = 0;
// int results[100];
int testFinished = 1;
struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

void seqAsync(int, int);
void parAsync(int, int);
int syncJS(int, int);
void writeResults();
int emptyJS();
void startLoggerTest();


jsync int cSyncReturn() {
	return 0;
}

jasync cAsyncReturn() {
	return;
}

void asyncCallTimeSequencial() {
	clock_gettime(clk_id, &tp);
	seqAsync(tp.tv_sec, tp.tv_nsec);
    printf("Done Sync Async....\n");
}

void gohere() {
    printf("------------------->>>>    Hello......\n");
    writeResults();
}

jasync asyncDone() {

	iteration++;
    printf("In async Done....iteration %d, numTests %d\n", iteration, numTests);
	if(iteration < numTests) {
		asyncCallTimeSequencial();
	} else {
		testFinished = 1;
	       gohere();
	}
}


void asyncCallTimeParallel() {
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		parAsync(tp.tv_sec, tp.tv_nsec);
	}
}

jasync asyncDone2() {
	testFinished = 1;
}


void syncCallTime() {
	for (int i = 0; i < numTests; i++) {
		clock_gettime(clk_id, &tp);
		syncJS(tp.tv_sec, tp.tv_nsec);
	}
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
		nanosleep(&sleepValue, NULL);
	}
}

void broadcastStarter() {
	int count = 0;
	char* lastVal;
	char* curVal;
	char buf[50];
	char *ptr;

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
}


void main() {

	iteration = 0;
	printf("Running sequential async js calls");
	testFinished = 0;
	asyncCallTimeSequencial();


//	while(testFinished == 0);
	// iteration = 0;
	// printf("Running sequential async js calls");
	// asyncCallTimeParallel();


	// while(testFinished == 0);
	// printf("Running sync js calls");
	// syncCallTime();


	// syncRoundTrip();
	// loggerTime();

//	writeResults();
	// broadcastStarter();
}
