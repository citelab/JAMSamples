#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
//#include <pthread.h>
#include <sys/time.h>
#define _GNU_SOURCE

char* getId();

int receiveWait;    //how long to sleep when waiting for messages from broadcaster
int sendWait;       //how long tp sleep between sending messages
char* nodeID;
struct timeval  tv1, tv2;
struct tracker{
    char* text;
    struct timeval tv1;
    struct timeval tv2;
};
struct tracker trackers[2];
char fileName[40];
int tracking = 0;
int processCount = 100; //The number of items each node is to process
int finalCount;     //The actual number of items each node processed

//Read entries from the sensor file and send it through to the fog
void sendSensorData(){
    printf("In send function\n");

    FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./sensor_readings_2.data", "r");
    if (fp == NULL){
        printf("Unable to read the sensor data file\n");
        return;
    }


    int id = 0;
    int total = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        if( id >= processCount )
            break;

        id++;

        if (strcmp(line, "") == 0 || strcmp(line, "\n") == 0)
            break;

        struct timeval  tv1;
        gettimeofday(&tv1, NULL);

        char pack[150];
        snprintf(pack,sizeof(pack),"%lu,%lu,%s,%s,%d", tv1.tv_sec, tv1.tv_usec, line, nodeID, id);

        //log line to the device J
        sensePack = pack;

        usleep(sendWait);
    }
    //signal JNode to start processing
    sensePack = "done";

    printf("Done sending sensor data (%d)...\n", id);

    fclose(fp);
    if (line)
        free(line);
}


int main(int argc, char** argv){
    printf("C is running...\n");

    nodeID = getId();
    sendWait = 500;
    receiveWait = 500;

    strcpy(fileName, "results/");
    strcat(fileName, nodeID);
    strcat(fileName, "_timing.txt");

    printf("%s %d %d\n", nodeID, sendWait, receiveWait);

    //sleep(3);   //sleep for 3 seconds let the other levels start

    sendSensorData();

    return 0;
}
