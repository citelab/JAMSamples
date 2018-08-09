#include <time.h>
#define NUMTESTS 1000
int iteration = 0;
struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

int jSequentialResults[NUMTESTS];
int jParallelResults[NUMTESTS];

void seqAsync(int, int);
void parAsync(int, int);
void warmUpAsync(int, int);
int warmUpSync(int, int);
int syncJS(int, int);
int syncJSCond(int, int);
void jParallelDone();
void jSequentialDone();
int emptyJS();
void syncRoundTrip();
void syncCallTime();
void asyncCallTimeParallel();
void syncCondCallTime();
void startJSTests();
void asyncCallTimeSequencial();

int seqAsyncCounter = 0;
int parallelAsyncCounter = 0;


jasync sequentialAsync(int startSec, int startNS) {
	clock_gettime(clk_id, &tp);
	int secDelay = tp.tv_sec - startSec;
	int nsDelay = tp.tv_nsec - startNS;

	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}

	jSequentialResults[seqAsyncCounter] = nsDelay;
	seqAsyncCounter++;
    jSequentialDone();
}

jasync parallelAsync(int startSec, int startNS) {
	clock_gettime(clk_id, &tp);
	int secDelay = tp.tv_sec - startSec;
	int nsDelay = tp.tv_nsec - startNS;

	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}

	jParallelResults[parallelAsyncCounter] = nsDelay;
	parallelAsyncCounter++;

	if(parallelAsyncCounter == NUMTESTS) {
		jParallelDone();
	}
}



jsync int cSyncReturn() {
	return 0;
}

jasync cAsyncReturn() {
	return;
}

void warmUp() {
	clock_gettime(clk_id, &tp);
	warmUpAsync(tp.tv_sec, tp.tv_nsec);
}


jasync warmUpDone() {
	iteration++;
	if(iteration < NUMTESTS) {
		warmUp();
	} else {
		iteration = 0;
		for (int i = 0; i < NUMTESTS; i++) {
			clock_gettime(clk_id, &tp);
			warmUpSync(tp.tv_sec, tp.tv_nsec);
		}
		asyncCallTimeSequencial();
	}
}

void asyncCallTimeSequencial() {
	clock_gettime(clk_id, &tp);
	seqAsync(tp.tv_sec, tp.tv_nsec);
}


jasync asyncDone() {
	iteration++;
	if(iteration < NUMTESTS) {
		asyncCallTimeSequencial();
	} else {
		asyncCallTimeParallel();
	}
}


void asyncCallTimeParallel() {
	for (int i = 0; i < NUMTESTS; i++) {
		clock_gettime(clk_id, &tp);
		parAsync(tp.tv_sec, tp.tv_nsec);
	}
}

jasync asyncDone2() {
	syncCallTime();
}


void syncCallTime() {
	for (int i = 0; i < NUMTESTS; i++) {
		clock_gettime(clk_id, &tp);
		syncJS(tp.tv_sec, tp.tv_nsec);
	}
	syncCondCallTime();
}

void syncCondCallTime() {
	for (int i = 0; i < NUMTESTS; i++) {
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
	for (int i = 0; i < NUMTESTS; i++) {
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
	startJSTests();
}


jasync writeCResults() {
	FILE *fSeq = fopen("jsAsyncSequential.txt", "w");
	for (int i = 0; i < NUMTESTS; i++) {
		fprintf(fSeq, "%i\n", jSequentialResults[i]);
	}
	fclose(fSeq);

	FILE *fPar = fopen("jsAsyncParallel.txt", "w");
	for (int i = 0; i < NUMTESTS; i++) {
		fprintf(fPar, "%i\n", jParallelResults[i]);
	}
	fclose(fPar);
}

void main() {

	warmUp();
}
