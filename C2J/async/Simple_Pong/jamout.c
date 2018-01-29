#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <stdio.h>
jamstate_t *js;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
void pong() {
jact = jam_create_activity(js);
jact = jam_rexec_async(js, jact, "true", 0, "pong", "");
activity_free(jact);
}

int user_main(int argc, char **argv) {
long long btime;
int i;
for (i = 0; i < argc; i++) printf("Argv[%d] = %s\n", i, argv[i]);
while(1) {
printf("Calling pong..\n");
pong();
printf("After pong \n");
usleep(1000);
}
}

void user_setup() {
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
