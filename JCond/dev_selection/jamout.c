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
jambroadcaster_t *x;
int getMyId() {
jam_error = 0; 
arg_t *res = jam_rexec_sync(js, "jcond.get('devonly').source", 1, "getMyId", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getMyId"); jam_error = 1;command_arg_free(res);
return -1;} else {int ret = res->val.ival;
command_arg_free(res);
return ret;
}
}

void execcall_get_myid(char* msg, jcallback putid){
char buf[256];
int myid = getMyId();
if(jam_error == 0) {
printf("My id %d\n", myid);
sprintf(buf, "%d", myid);
{
jact = jam_create_activity(js);
jam_rexec_async(js, jact, "true", 0, putid, "%s", buf);
activity_free(jact);
}
;
}
}
void call_get_myid(char* msg, jcallback putid) {
jam_lexec_async("execcall_get_myid", msg, putid);
}
void callcall_get_myid(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
execcall_get_myid(cmd->args[0].val.sval, cmd->args[1].val.sval);
}

int user_main() {
printf("Started C node...\n");
}

void user_setup() {
activity_regcallback(js->atable, "call_get_myid", ASYNC, "ss", callcall_get_myid);
x = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "x");
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
