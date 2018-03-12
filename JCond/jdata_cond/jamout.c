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
jambroadcaster_t *y;
jambroadcaster_t *z;
void pong() {
jact = jam_create_activity(js);
jact = jam_rexec_async(js, jact, "jcond.get('numcheck').source", 16, "pong", "");
activity_free(jact);
}

int ping() {
pong();
return 0;
}
int user_main(int argc, char **argv) {
int i;
for (i = 0; i < 10; i++) {
sleep(3);
ping();
}
return 0;
}

void user_setup() {
y = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "y");
z = jambroadcaster_init(BCAST_RETURNS_NEXT, "global", "z");
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
