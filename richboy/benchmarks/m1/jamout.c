#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>
#define _GNU_SOURCE
jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
struct sensorData {
float sd_front;
float sd_left;
char* _class;
char* nodeID;
};
struct announcer {
char* nodeID;
char* message;
};
jambroadcaster_t *announce;
char* getId() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "true", 0, "getId", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getId"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

int receiveWait;
int sendWait;
char *nodeID;
struct timeval tv1, tv2;
struct tracker {
char *text;
struct timeval tv1;
struct timeval tv2;
} ;
struct tracker trackers[2];
char fileName[40];
int tracking = 0;
void sendSensorData() {
printf("In send function\n");
FILE * fp;
char *line = 0;
size_t len = 0;
ssize_t read;
fp = fopen("./sensor_readings_2.data", "r");
if(fp == 0) {
printf("Unable to read the sensor data file\n");
return;
}
struct timeval tv1;
gettimeofday(&tv1, 0);
trackers[0].text = "";
trackers[0].tv1 = tv1;
while((read = getline(&line, &len, fp)) != -1) {
char *p = strtok(line, ",");
float sd_front = atof(p);
p = strtok(0, ",");
float sd_left = atof(p);
p = strtok(0, ",");
char *_class = p;
printf("Sending... data..\n");
jamdata_log_to_server("global", "sensorData", jamdata_encode("ffss", "sd_front", sd_front, "sd_left", sd_left, "_class", _class, "nodeID", nodeID), 1);
usleep(sendWait);
}
gettimeofday(&tv1, 0);
trackers[1].text = "";
trackers[1].tv1 = tv1;
jamdata_log_to_server("global", "sensorData", jamdata_encode("ffss", "sd_front", "", "sd_left", "", "_class", "", "nodeID", nodeID), 1);
fclose(fp);
if(line) free(line);
}
int user_main(int argc, char **argv) {
printf("C is running...\n");
nodeID = getId();
sendWait = 500;
receiveWait = 500;
strcpy(fileName, "results/");
strcat(fileName, nodeID);
strcat(fileName, "_timing.txt");
printf("%s %d %d\n", nodeID, sendWait, receiveWait);
sleep(3);
sendSensorData();
struct announcer announcement;
while(1) {
jamdata_decode("ss", get_bcast_next_value(announce), 2, &announcement, offsetof(struct announcer, nodeID), offsetof(struct announcer, message));

if(strcmp(announcement.nodeID, nodeID) == 0) {
struct timeval tv2;
gettimeofday(&tv2, 0);
trackers[0].tv2 = tv2;
trackers[1].tv2 = tv2;
FILE *f = fopen(fileName, "a");
if(f == 0) {
printf("Error opening file!\n");
return 1;
}
fprintf(f, "Time before sending sensor results: %f seconds; Time after sending sensor results: %f seconds\n", (double)(trackers[0].tv2.tv_usec - trackers[0].tv1.tv_usec) / 1000000 + (double)(trackers[0].tv2.tv_sec - trackers[0].tv1.tv_sec), (double)(trackers[1].tv2.tv_usec - trackers[1].tv1.tv_usec) / 1000000 + (double)(trackers[1].tv2.tv_sec - trackers[1].tv1.tv_sec));
fclose(f);
}
usleep(receiveWait);
}
return 0;
}

void user_setup() {
announce = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "announce");
}

void jam_run_app(void *arg) {

          comboptr_t *cptr = (comboptr_t *)arg; 
user_main(cptr->iarg, (char **)cptr->argv);
}

void taskmain(int argc, char **argv) {

    int argoff = jamargs(argc, argv, app_id, dev_tag, &ndevices);
    argc = argc - argoff;
    argv = &(argv[argoff]);
    comboptr_t *cptr = create_combo3ip_ptr(NULL, NULL, NULL, argc, (void **)argv);

    js = jam_init(ndevices);

    user_setup();

    taskcreate(jam_event_loop, js, 50000);
    taskcreate(jam_run_app, cptr, 50000);
  }
