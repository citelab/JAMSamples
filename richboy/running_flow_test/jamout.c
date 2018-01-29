#include <unistd.h>
#include "jamdata.h"
#include "command.h"
#include "jam.h"
#include <unistd.h>
#include <stdlib.h>
jamstate_t *js;
jactivity_t *jact;
typedef char* jcallback;
char jdata_buffer[20];
char app_id[64] = { 0 };
char dev_tag[32] = { 0 };
int ndevices;
struct pack {
char* name;
int age;
};
int user_main() {
char *name;
while(1) {
sprintf(jdata_buffer, "%i", rand() % 15 + 15);
jamdata_log_to_server("global", "temp", jdata_buffer, 0);
int index = rand() % 3;
if(index == 0) name = "richboy"; else if(index == 1) name = "hilda"; else if(index == 2) name = "echomgbe";
jamdata_log_to_server("global", "pack", jamdata_encode("si", "name", name, "age", (rand()%10)*(rand()%5)), 1);
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
