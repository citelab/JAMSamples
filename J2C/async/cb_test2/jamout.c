#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"

jamstate_t *js;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
int id;
int getid() {
arg_t *res = jam_rexec_sync(js, "true", 0, "getid", "");
if (res == NULL) { printf("Remote execution error: %s\n", "getid"); exit(1); }int ret = res->val.ival;
command_arg_free(res);
return ret;
}

void exectest2(char* m, jcallback ccc){
char *s = "fffff";
if(1) jact = jam_create_activity(js);
jam_rexec_async(js, jact, "true", 0, ccc, "%s", s);
activity_free(jact);
;
}
void test2(char* m, jcallback ccc) {
jam_lexec_async("exectest2", m, ccc);
}
void calltest2(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
exectest2(cmd->args[0].val.sval, cmd->args[1].val.sval);
}

void exectestcback(char* m, jcallback cb){
char *s1 = "c-msg from 1";
char *s2 = "c-msg from 2";
printf("=========>>>>%s\n", m);
switch(id) {
case 1:
jact = jam_create_activity(js);
jam_rexec_async(js, jact, "true", 0, cb, "%s", s1);
activity_free(jact);
;
break;
case 2:
jact = jam_create_activity(js);
jam_rexec_async(js, jact, "true", 0, cb, "%s", s2);
activity_free(jact);
;
break;
default:
jact = jam_create_activity(js);
jam_rexec_async(js, jact, "true", 0, cb, "%s", "c-msg from unknown");
activity_free(jact);
;
}
}
void testcback(char* m, jcallback cb) {
jam_lexec_async("exectestcback", m, cb);
}
void calltestcback(void *act, void *arg) {
command_t *cmd = (command_t *)arg;
exectestcback(cmd->args[0].val.sval, cmd->args[1].val.sval);
}

int user_main(int argc, char **argv) {
id = getid();
printf("My id %d\n", id);
}

void user_setup() {
activity_regcallback(js->atable, "test2", ASYNC, "ss", calltest2);
activity_regcallback(js->atable, "testcback", ASYNC, "ss", calltestcback);
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
