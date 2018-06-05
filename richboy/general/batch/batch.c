#include <unistd.h>
#include <time.h>

int main(int argc, char **argv) {
    srand(time(NULL));

    int xval, yval;
    int dataval;

    for (int i = 1;; i++) {
        xval = rand() % 100;
        yval = rand() % 100;
        dataval = rand() % 1000;

        printf("x=%d, y=%d, val=%d\n", xval, yval, dataval);

        mtrx = {
            .x: xval,
            .y: yval,
            .val: dataval
        };

        if( i == 5 )
            break;

        sleep(1);
    }

    return 0;
}