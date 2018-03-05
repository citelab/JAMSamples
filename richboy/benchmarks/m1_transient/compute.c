#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
//#include <pthread.h>
#include <sys/time.h>
#define _GNU_SOURCE

char* getId();
char* getJob(char*);

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


void waitBroadcast(){
    printf("In waitBroadcast...\n");
    int status = 0; //to know if we have seen the first broadcast

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

            if( status == 0 ){
                status = 1;
                //The second index for trackers keeps the time from when we started receiving the broadcast ML query/test data (tv1) and when we received the last test data (tv2)
                struct timeval  tv1;
                gettimeofday(&tv1, NULL);

                FILE *f = fopen(fileName, "a");
                 if (f == NULL){
                     printf("Error opening file!\n");
                     return;
                 }

                 fprintf(f, "(First broadcast) Current time is %lu secs, %lu microseconds\n", tv1.tv_sec, tv1.tv_usec);

                 fclose(f);
            }

            //check if we have gotten to the last item
            if( strcmp(tempID, "done") == 0 ){
                struct timeval  tv2;
                gettimeofday(&tv2, NULL);

                FILE *f = fopen(fileName, "a");
                 if (f == NULL){
                     printf("Error opening file!\n");
                     return;
                 }

                 fprintf(f, "(Last broadcast) Current time is %lu secs, %lu microseconds\n", tv2.tv_sec, tv2.tv_usec);

                 fclose(f);

                 char timepack[100];
                 snprintf(timepack,sizeof(timepack),"%lu,%lu,[Node: %s],end", tv2.tv_sec, tv2.tv_usec, nodeID);
                 timing = timepack;

                break;
            }
        }
    }
}

//Read entries from the sensor file and send it through to the fog
void process(){
    printf("In process function\n");

    time_t t;
    srand((unsigned) time(&t));

    //enter contest for data, send data, check if we sent all, wait for broadcast, enter contest for data
    //for sending data, randomly determine if a node should complete the job. If should not, randomly determine how much data should be sent
    //after completing any job, randomly determine if a node should sleep for a long time to simulate leaving

    do{
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

        //printf("Before sending data...\n");

        //ask for job from fog
        char* jobData = getJob(nodeID);
        //split data to separate work parts
        char* p = strtok(jobData, ",");
        char* jobID = p;
        p = strtok (NULL, ",");
        int startIndex = atoi(p);
        p = strtok (NULL, ",");
        int endIndex = atoi(p);

        if( endIndex != 0 ){//if a job was sent back
            //determine if this node should complete this job
            int val = rand() % 2;   //0=complete, 1=do not complete
            int stopIndex = rand() % (endIndex + 1 - startIndex) + startIndex;  //determine at what point this node should stop/leave

            int id = 0;
            int total = 0;
            while ((read = getline(&line, &len, fp)) != -1) {
                if( id < startIndex ){    //skip until we get to the data boundary for this device to process
                    id++;
                    continue;
                }

                id++;

                if (strcmp(line, "") == 0 || strcmp(line, "\n") == 0)
                    break;

                char pack[100];
                snprintf(pack,sizeof(pack),"%s,%s,%s,%d", line, jobID, nodeID, id);

                //log line to the device J
                sensePack = pack;

                total++;

                if( val == 1 && stopIndex == id ){   //simulate leaving
                    //sleep for 30 seconds
                    sleep(30);
                    break;
                }
                if( id == endIndex )
                    break;

                usleep(sendWait);
            }

            gettimeofday(&tv2, NULL);
            trackers[0].tv2 = tv2;

            printf("Done sending sensor data (%d)...\n", id);

            fclose(fp);
            if (line)
                free(line);

            if( val == 0 )
                waitBroadcast();
        }
        //randomly determine what this node should do next, wait, sleep or request for another job
        int val = rand() % 3;   //0=wait, 1=sleep, 2=request for job immediately
        if( val == 0 )
            sleep(5);
        else if( val == 1 )
            sleep(30);
    }
    while(1);
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

    process();

    return 0;
}
