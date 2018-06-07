#include <unistd.h>

int main() {
    int xval, yval;
    float dataval;

    for (int i = 1;; i++) {
        //
        xval = rand() % 100;
        yval = rand() % 100;
        dataval = (rand() % 1000) * 1.25;

        printf("X %d Y %d Val %d\n", xval, yval, dataval);

        matrx = {
            .x: xval,
            .y: yval,
            .val: dataval
        };

//        dval = i; //dataval;
        sleep(1);
    }
}
