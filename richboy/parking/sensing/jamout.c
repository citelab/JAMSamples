#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
struct spot {
char* label;
char* postcode;
char* address;
int parkingDuration;
char* status;
int assignedID;
char* key;
};
struct assignment {
char* status;
char* carID;
int slotID;
int postcode;
char* key;
};
jambroadcaster_t *assignment;
int isFogRunning() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isFog').source", 2, "isFogRunning", "");
if (res == NULL) { printf("Remote execution error: %s\n", "isFogRunning"); jam_error = 1;command_arg_free(res);
return -1;} else {int ret = res->val.ival;
command_arg_free(res);
return ret;
}
}

int getAssignedID() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getAssignedID", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getAssignedID"); jam_error = 1;command_arg_free(res);
return -1;} else {int ret = res->val.ival;
command_arg_free(res);
return ret;
}
}

char* getLabel(int assignedID) {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getLabel", "i",assignedID);
if (res == NULL) { printf("Remote execution error: %s\n", "getLabel"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

char* getPostcode(int assignedID) {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getPostcode", "i",assignedID);
if (res == NULL) { printf("Remote execution error: %s\n", "getPostcode"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

char* getAddress(int assignedID) {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getAddress", "i",assignedID);
if (res == NULL) { printf("Remote execution error: %s\n", "getAddress"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

char* getStreamKey(int assignedID) {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getStreamKey", "i",assignedID);
if (res == NULL) { printf("Remote execution error: %s\n", "getStreamKey"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

char *label;
char *status = "free";
char *postcode;
char *address;
char *key;
int assignedID;
const  int PARKING_DURATION = 60;
void doLog() {
jamdata_log_to_server("global", "spot", jamdata_encode("sssisis", "label", label, "postcode", postcode, "address", address, "parkingDuration", PARKING_DURATION, "status", status, "assignedID", assignedID, "key", key), 1);
}
int user_main() {
printf("C is running...\n");
srand(time(0));
assignedID = getAssignedID();
while(jam_error != 0) {
usleep(2000);
assignedID = getAssignedID();
}
printf("Assigned ID is: %d\n", assignedID);
label = getLabel(assignedID);
postcode = getPostcode(assignedID);
address = getAddress(assignedID);
key = "null";
doLog();
key = getStreamKey(assignedID);
while(jam_error != 0 || strncmp(key, "null", 4) == 0) {
usleep(2000);
key = getStreamKey(assignedID);
}
printf("Assigned ID is: %d, Stream Key is: %s\n", assignedID, key);
doLog();
doLog();
doLog();
return 0;
}
void execchangeState(char* state, int spotID, char* k){
if(assignedID != spotID || key != k) return;
status = state;
doLog();
}
void changeState(char* state, int spotID, char* k) {
jam_lexec_async("execchangeState", state, spotID, k);
}
void callchangeState(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
execchangeState(cmd->args[0].val.sval, cmd->args[1].val.ival, cmd->args[2].val.sval);
}


void user_setup() {
activity_regcallback(js->atable, "changeState", ASYNC, "sis", callchangeState);
assignment = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "assignment");
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
