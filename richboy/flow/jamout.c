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
struct weather {
int date;
int highTemperature;
int lowTemperature;
float humidity;
float wind;
char* airQuality;
char* UV;
};
int user_main() {
int low, diff, date;
float hum, wind;
for (int i = 1; ; i++) {
date = i % 31 + 1, low = rand() % 15 + 15;
diff = rand() % 10;
hum = (rand() % 100) / 100;
wind = rand() % 25 + (rand() % 10) / 10;
jamdata_log_to_server("global", "MTLWeather", jamdata_encode("iiiffss", "date", date, "highTemperature", low+diff, "lowTemperature", low, "humidity", hum, "wind", wind, "airQuality", "good", "UV", "strong"), 1);
usleep(30000);
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
