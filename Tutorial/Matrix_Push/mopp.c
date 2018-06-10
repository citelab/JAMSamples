#include <unistd.h>
#include <stdio.h>
#include <time.h>

struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

int getID();
void checkUpload(char *, jcallback);
void processRequest(char *, jcallback);

int ready = 0;
int count;

int maxtasks = 500;
int goodreqs = 0, badreqs = 0;


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


void next_process(char *msg)
{
    maxtasks--;
    if (maxtasks <= 0)
    {
        printf("Good tasks: %d\n", goodreqs);
        printf("Bad tasks: %d\n", badreqs);
        return;
    }


    if (strcmp(msg, "-") == 0)
    {
        usleep(500000);
        char buf[32];
        sprintf(buf, "%d", count);
        last_req_failed = 1;
        processRequest(buf, next_process);
        badreqs++;
    }
    else
    {
        char buf[32];
        sprintf(buf, "%d", count);
        if (last_req_failed)
        {
            last_req_failed = 0;
            maxtasks++;
            printf("Request time (for retry): %g\n", read_clock());
        } else
            printf("Request time: %g\n", read_clock());

        usleep(500000);
        read_clock();
        processRequest(buf, next_process);
        goodreqs++;
    }
}


void upload_done(char *msg)
{
    printf("Upload time: %g\n", read_clock());
    char buf[32];
    sprintf(buf, "%d", count);
    processRequest(buf, next_process);
}

void *inject_request(void *arg)
{
    int i;

    for (i = 0; i < 100; i++)
    {
        read_clock();
        ready = 0;
        printf("Sending request... \n");
        //processRequest("hello", retcall);
        while (1)
        {
            int val;
            val = ready;
            if (val == 1)
                break;
            usleep(50);
        }
        printf("Process time: %g\n", read_clock());
        usleep(10000);
    }
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
//            printf("Percent pushed: %f\n", (linenum * 1.0)/count);
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

    checkUpload("hello", upload_done);
}
