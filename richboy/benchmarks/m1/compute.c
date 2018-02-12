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


//Read entries from the sensor file and send it through to the fog
void sendSensorData(){
    printf("In send function\n");

    FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./sensor_readings_2.data", "r");
    if (fp == NULL){
        printf("Unable to read the sensor data file");
        return;
    }

    struct timeval  tv1;
    gettimeofday(&tv1, NULL);
    trackers[0].text = "";
    trackers[0].tv1 = tv1;

    while ((read = getline(&line, &len, fp)) != -1) {
        //split line to the different parts
        char* p = strtok(line, ",");
        char* sd_front = p;
        p = strtok (NULL, ",");
        char* sd_left = p;
        p = strtok (NULL, ",");
        char* _class = p;

//        int tag = tracking;
//        ++tracking;
//        //printf("Sent %s at\n", p);
//        struct timeval  tv1;
//        gettimeofday(&tv1, NULL);
//        trackers[tag].text = line;
//        trackers[tag].tv1 = tv1;
        //log line to the device J
        sensorData = {.sd_front:sd_front, .sd_left:sd_left, ._class:_class, .nodeID:nodeID};//, .index:tag

        usleep(sendWait);
    }
    //add control value to signal end of sensor transfer
    gettimeofday(&tv1, NULL);
    trackers[1].text = "";
    trackers[1].tv1 = tv1;
    //log line to the device J
    sensorData = {.sd_front:"", .sd_left:"", ._class:"", .nodeID:nodeID};

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

    sleep(3);   //sleep for 3 seconds let the other levels start

    sendSensorData();

    //wait for broadcast
    struct announcer announcement;
    while(1){
        announcement = announce;
        if( strcmp(announcement.nodeID, nodeID) == 0 ){
            struct timeval  tv2;
            gettimeofday(&tv2, NULL);
            trackers[0].tv2 = tv2;
            trackers[1].tv2 = tv2;

             //printf("Received %s\n", mess);
             FILE *f = fopen(fileName, "a");
             if (f == NULL){
                 printf("Error opening file!\n");
                 return 1;
             }

             fprintf(f, "Time before sending sensor results: %f seconds; Time after sending sensor results: %f seconds\n",
                              (double) (trackers[0].tv2.tv_usec - trackers[0].tv1.tv_usec) / 1000000 +
                              (double) (trackers[0].tv2.tv_sec - trackers[0].tv1.tv_sec),
                              (double) (trackers[1].tv2.tv_usec - trackers[1].tv1.tv_usec) / 1000000 +
                              (double) (trackers[1].tv2.tv_sec - trackers[1].tv1.tv_sec));

             fclose(f);
        }
        usleep(receiveWait);
    }

    return 0;
}