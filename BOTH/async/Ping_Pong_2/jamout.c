#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <unistd.h>
jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
int perank;
int count = 0;
void pingserver(int penum) {
jact = jam_create_activity(js);
jact = jam_rexec_async(js, jact, "true", 0, "pingserver", "i",penum);
activity_free(jact);
}

void regme(char* msg, jcallback cback) {
jact = jam_create_activity(js);
jact = jam_rexec_async(js, jact, "true", 0, "regme", "ss",msg, cback);
activity_free(jact);
}

void regcallback(char *msg) {
if(msg != 0) perank = atoi(msg); else perank = -1;
printf("Perank %d\n", perank);
while(1) {
usleep(1);
printf("Pinging %d, count %d\n", perank, count++);
pingserver(perank);
}
}
int user_main() {
printf("Registering...");
regme("hello", "regcallback");
return 0;
}
void callregcallback(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
regcallback(cmd->args[0].val.sval);
}

void user_setup() {
activity_regcallback(js->atable, "regcallback", ASYNC, "s", callregcallback);
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
