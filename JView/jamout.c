#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <stdlib.h>
jamstate_t *js;
int jam_error = 0;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
int user_main() {
while(1) {
sprintf(jdata_buffer, "%f", rand() % 100 + 0.1 * (rand() % 10));
jamdata_log_to_server("global", "temp", jdata_buffer, 0);
sprintf(jdata_buffer, "%i", rand() % 100);
jamdata_log_to_server("global", "pos", jdata_buffer, 0);
sleep(1);
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
