#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <unistd.h>
#include <stdlib.h>
jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
struct request {
int messageType;
char* carID;
char* postcode;
int openToNearbyLocation;
int slotID;
};
struct resp {
int messageType;
char* label;
char* slotID;
char* carID;
int isPreferred;
char* postcode;
int duration;
int timeout;
};
jambroadcaster_t *resp;
char* getCarID() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('isDevice').source", 1, "getCarID", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getCarID"); jam_error = 1;command_arg_free(res);
return NULL;} else {char* ret = strdup(res->val.sval);
command_arg_free(res);
return ret;
}
}

char *carID;
void execpark(char* postcode, char* slot){

}
void park(char* postcode, char* slot) {
jam_lexec_async("execpark", postcode, slot);
}
void callpark(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
execpark(cmd->args[0].val.sval, cmd->args[1].val.sval);
}

int user_main(int argc, char **argv) {
carID = getCarID();
while(jam_error != 0) {
usleep(2000);
carID = getCarID();
}
printf("Assigned Car ID is: %s\n", carID);
return 0;
}

void user_setup() {
activity_regcallback(js->atable, "park", ASYNC, "ss", callpark);
resp = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "resp");
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
