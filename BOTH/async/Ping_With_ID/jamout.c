#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"

jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
int getid() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "true", 0, "getid", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getid"); jam_error = 1;command_arg_free(res);
return -1;} else {int ret = res->val.ival;
command_arg_free(res);
return ret;
}
}

void pingj(int src) {
jact = jam_create_activity(js);
jact = jam_rexec_async(js, jact, "true", 0, "pingj", "i",src);
activity_free(jact);
}

void execdoping(){
int myid = getid();
printf("My id %d\n", myid);
pingj(myid);
}
void doping() {
jam_lexec_async("execdoping");
}
void calldoping(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
execdoping();
}

int user_main() {
printf("Started...\n");
}

void user_setup() {
activity_regcallback(js->atable, "doping", ASYNC, "", calldoping);
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
