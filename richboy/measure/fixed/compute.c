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
int processCount = 1000; //The number of items each node is to process
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

//    int status = 0; //to know if we have seen the first broadcast
//
//    if( finalCount == 0 )   //If we started more C than is necessary
//        return 0;
//
//    //wait for broadcast
//    //struct announcer announcement;
//    while(1){
//        printf("Waiting for broadcast...\n");
//        char* announcement = announcer;
//        printf("Received broadcast!!\n");
//
//        //break the string apart
//        char* p = strtok(announcement, ",");
//        char* predicted = p;
//        p = strtok (NULL, ",");
//        char* actual = p;
//        p = strtok (NULL, ",");
//        char* tempNodeID = p;
//        p = strtok (NULL, ",");
//        char* tempID = p;
//
//        if( strcmp(tempNodeID, nodeID) == 0 ){//strcmp(announcement.nodeID, nodeID) == 0
//            printf("Received %s\n", announcement);
//
//            if( status == 0 ){
//                status = 1;
//                //The second index for trackers keeps the time from when we started receiving the broadcast ML query/test data (tv1) and when we received the last test data (tv2)
//                struct timeval  tv1;
//                gettimeofday(&tv1, NULL);
//                trackers[1].tv1 = tv1;
//
//                FILE *f = fopen(fileName, "a");
//                 if (f == NULL){
//                     printf("Error opening file!\n");
//                     return 1;
//                 }
//
//                 fprintf(f, "Total Processed: %d\n", finalCount);
//
//                 fprintf(f, "(First broadcast) From time before sending sensor results: %f seconds; From time after sending sensor results: %f seconds\n",
//                                  (double) (trackers[1].tv1.tv_usec - trackers[0].tv1.tv_usec) / 1000000 +
//                                  (double) (trackers[1].tv1.tv_sec - trackers[0].tv1.tv_sec),
//                                  (double) (trackers[1].tv1.tv_usec - trackers[0].tv2.tv_usec) / 1000000 +
//                                  (double) (trackers[1].tv1.tv_sec - trackers[0].tv2.tv_sec));
//
//                 fclose(f);
//            }
//
//            //check if we have gotten to the last item
//            if( strcmp(tempID, "done") == 0 ){
//                struct timeval  tv2;
//                gettimeofday(&tv2, NULL);
//                trackers[1].tv2 = tv2;
//
//                FILE *f = fopen(fileName, "a");
//                 if (f == NULL){
//                     printf("Error opening file!\n");
//                     return 1;
//                 }
//
//                 fprintf(f, "(Last broadcast) From time before sending sensor results: %f seconds; From time after sending sensor results: %f seconds\n",
//                                  (double) (trackers[1].tv2.tv_usec - trackers[0].tv1.tv_usec) / 1000000 +
//                                  (double) (trackers[1].tv2.tv_sec - trackers[0].tv1.tv_sec),
//                                  (double) (trackers[1].tv2.tv_usec - trackers[0].tv2.tv_usec) / 1000000 +
//                                  (double) (trackers[1].tv2.tv_sec - trackers[0].tv2.tv_sec));
//
//                 fclose(f);
//
//                 char timepack[100];
//                  snprintf(timepack,sizeof(timepack),"%lu,%lu,[Node: %s],end", tv2.tv_sec, tv2.tv_usec, nodeID);
//                  timing = timepack;
//
//                break;
//            }
//        }
//        //usleep(receiveWait);
//    }

    return 0;
}
