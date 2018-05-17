#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>
#define _GNU_SOURCE

int sendWait = 10000;
char* nodeID;

void logData(){
    printf("In log function\n");

    FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./dataset.txt", "r");
    if (fp == NULL){
        printf("Unable to read the sensor data file\n");
        return;
    }


    int id = 0;
    int total = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        id++;

        if (strcmp(line, "") == 0 || strcmp(line, "\n") == 0)
            break;

        struct timeval  tv1;
        gettimeofday(&tv1, NULL);

        char pack[150];
        snprintf(pack,sizeof(pack),"%lu,%lu,%s,%s,%d", tv1.tv_sec, tv1.tv_usec, line, nodeID, id);

        //log line to the device J
        heartRate = pack;

        usleep(sendWait);
    }

    printf("Done sending data (%d)...\n", id);

    fclose(fp);
    if (line)
        free(line);
}

int main(int argc, char** argv) {
    printf("C is running...\n");

    nodeID = dev_tag;

    logData();

	return 0;
}