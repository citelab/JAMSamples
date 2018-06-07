#include <unistd.h>
#include <stdio.h>
#include <time.h>
struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

int getID();
void solveProb(char *, jcallback);
void processMatrix(char *, jcallback);

int ready = 0;
int count;


void start_clock()
{
    clock_gettime(clk_id, &tp);
}

double read_clock()
{
    struct timespec tq;
    clock_gettime(clk_id, &tq);

    double tval = (tq.tv_sec - tp.tv_sec) * 1000.0 + (tq.tv_nsec - tp.tv_nsec)/10E6;
    tp = tq;
    return tval;
}



void retcall(char *msg)
{
    if (strcmp(msg, "-") != 0)
        ready = 1;
}

int main(int argc, char *argv[])
{
    int i;
    int xval, yval;
    float dataval;
    int id;

    id = getID();
    printf("My ID is %d\n", id);

    FILE *fp = fopen("small.mtx", "r");
    if (fp == NULL)
    {
        printf("ERROR! Unable to open the file ..\n");
        exit(1);
    }

    int linenum = 0;

    char *line = NULL;
    size_t linecap = 0;
    ssize_t linelen;

    // Measuring uploading time.. start the clock here..
    start_clock();

    while ((linelen = getline(&line, &linecap, fp)) > 0)
    {
        if (line[0] == '%')
            continue;
        else if (linenum == 0)
        {
            int xcnt, ycnt;
            sscanf(line, "%d %d %d", &xcnt, &ycnt, &count);
            printf("Xcount %d Ycount %d Count %d \n", xcnt, ycnt, count);
        }
        else
        {
            int x, y;
            float val;
            sscanf(line, "%d %d %F", &x, &y, &val);

            mrow = {
                .x: x,
                .y: y,
                .val: val
            };
        }
        linenum++;
    }
    free(line);

    // Send the completion flag
    comp = 1;

    // C process the rest...
    while (!ready)
    {
        solveProb("hello", retcall);
        usleep(1000);
    }
    printf("Upload time: %g\n", read_clock());
    char buf[32];
    sprintf(buf, "%d", count);
    ready = 0;
    processMatrix(buf, retcall);
    while (!ready)
        usleep(50);
    printf("Process time: %g\n", read_clock());



}
