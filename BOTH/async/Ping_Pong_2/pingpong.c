#include <unistd.h>

int perank;
int counter = 0;

jactivity_t *pingserver(int);



jactivity_t *regme(char *, jcallback);

void regcallback(char *msg) {
  if (msg != NULL)
    perank = atoi(msg);
  else
    perank = -1;

  printf("Perank %d\n", perank);

  while(1) {
     usleep(1);
     printf("Pinging %d, count %d\n", perank, counter++);
     pingserver(perank);
  }
}


int main() {
  printf("Registering...");
  regme("hello", regcallback);
  return 0;
}
