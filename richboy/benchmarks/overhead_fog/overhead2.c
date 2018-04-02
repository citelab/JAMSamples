#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>
#define _GNU_SOURCE

char* getId();
int getPayload();

int receiveWait;    //how long to sleep when waiting for messages from broadcaster
int sendWait;       //how long tp sleep between sending messages
char* nodeID;
int PROCESS_COUNT;  //number of data item points to process;

void sendLog(){
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

    char timepack[100];
    snprintf(timepack,sizeof(timepack),"%lu,%lu,[Node: %s],start", tv1.tv_sec, tv1.tv_usec, nodeID);
    timing = timepack;

    printf("Before sending data...\n");


    int id = 0;
    int total = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        id++;

        if (strcmp(line, "") == 0 || strcmp(line, "\n") == 0)
            break;

        char pack[100];
        if( id == PROCESS_COUNT )   //if this is the last item
            snprintf(pack,sizeof(pack),"%s,%s,%s,%d", line, "last", nodeID, id);
        else
            snprintf(pack,sizeof(pack),"%s,%s,%d", line, nodeID, id);

        //log line to the device J
        sensePack = pack;

        total++;

        if( id == PROCESS_COUNT )
            break;

        usleep(sendWait);
    }

    printf("Done sending sensor data (%d)...\n", id);

    fclose(fp);
    if (line)
        free(line);
}

void receiveBroadcast(){
    printf("In receive function\n");

    //wait for broadcast
    while(1){
        printf("Waiting for broadcast...\n");
        char* announcement = announcer;
        printf("Received broadcast!!\n");

        //break the string apart
        char* p = strtok(announcement, ",");
        char* predicted = p;
        p = strtok (NULL, ",");
        char* actual = p;
        p = strtok (NULL, ",");
        char* tempNodeID = p;
        p = strtok (NULL, ",");
        char* tempID = p;

        if( strcmp(tempNodeID, nodeID) == 0 ){//strcmp(announcement.nodeID, nodeID) == 0
            printf("Received %s\n", announcement);

            //check if we have gotten to the last item
            if( atoi(tempID) == PROCESS_COUNT ){
                struct timeval  tv2;
                gettimeofday(&tv2, NULL);

                char timepack[100];
                snprintf(timepack,sizeof(timepack),"%lu,%lu,[Node: %s],end", tv2.tv_sec, tv2.tv_usec, nodeID);
                timing = timepack;

                break;
            }
        }
    }

    printf("Exiting receive function\n");
}

int main(int argc, char** argv){
    printf("C is running...\n");
    nodeID = getId();
    PROCESS_COUNT = getPayload();

    sendWait = 1000;
    receiveWait = 1000;

    printf("%s %d %d\n", nodeID, sendWait, receiveWait);

    sendLog();
    receiveBroadcast();

    return 0;
}
