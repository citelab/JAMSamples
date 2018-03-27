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
int processCount = 350; //The number of items each node is to process
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

    //The first time index keeps track of the time just before sending (tv1) and the time from after sending (tv2)

    struct timeval  tv1;
    gettimeofday(&tv1, NULL);
    trackers[0].text = "";
    trackers[0].tv1 = tv1;

    char timepack[100];
    snprintf(timepack,sizeof(timepack),"%lu,%lu,[Node: %s],start", tv1.tv_sec, tv1.tv_usec, nodeID);
    timing = timepack;

    printf("Before sending data...\n");

    int id = 0;
    int total = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        if( id < (atoi(nodeID) - 1) * processCount ){    //skip until we get to the data boundary for this device to process
            id++;
            continue;
        }

        id++;

        if (strcmp(line, "") == 0 || strcmp(line, "\n") == 0)
            break;

        char pack[100];
        snprintf(pack,sizeof(pack),"%s,%s,%d",line, nodeID, id);

        //log line to the device J
	    printf("Sending... data..\n");
        //sensorData = {.sd_front:sd_front, .sd_left:sd_left, ._class:_class, .nodeID:nodeID, .id:id};//, .index:tag
        sensePack = pack;
        total++;
        if( total == processCount )
            break;

        usleep(sendWait);
    }
    finalCount = total;

    if( finalCount == 0 ){   //If we started more C than is necessary
        printf("Exiting...\n");
        return;
    }

    sensePack = "done"; //Send end marker

    gettimeofday(&tv2, NULL);
    trackers[0].tv2 = tv2;

    printf("Done sending sensor data (%d)...\n", id);

    fclose(fp);
    if (line)
        free(line);

    printf("Exiting...\n");
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

    sleep(3);   //sleep for 3 seconds let the other levels start

    sendSensorData();

    return 0;
}
