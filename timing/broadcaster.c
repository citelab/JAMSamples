#define NUMTESTS 1000

struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

long results[NUMTESTS];


void broadcastStarter() {
	int count = 0;
	char* lastVal;
	char* curVal;
	char buf[50];
	char *ptr;


	while(1) {
		curVal = broadcastTime;
		if(curVal != lastVal) {
			clock_gettime(clk_id, &tp);

			snprintf(buf, 50, "%lu%09lu", tp.tv_sec, tp.tv_nsec);

	   		results[count] = strtol(buf, &ptr, 10) - strtol(curVal, &ptr, 10);

			lastVal = curVal;
			count++;


			if(count == NUMTESTS) {
				break;
			}
		}
	}
	
	FILE *f = fopen("broadcast.txt", "w");
	

	for (int i = 0; i < NUMTESTS; i++) {
   		fprintf(f, "%lu\n", results[i]);
	}

	fclose(f);
	exit(0);
}

void main() {
	broadcastStarter();
}
