#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>
#define _GNU_SOURCE

int main(){
    int count = 1;

    while(count < 1000000){
        struct timeval  tv1;
        gettimeofday(&tv1, NULL);

        char timepack[100];
        snprintf(timepack,sizeof(timepack),"%lu,%lu,Value=%d", tv1.tv_sec, tv1.tv_usec, count);
        logTime = timepack;

        count++;
        usleep(100);
    }

    return 0;
}