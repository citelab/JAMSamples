#include <stdio.h>


int main(int argc, char *argv[])
{
    FILE *fp = fopen("b1_ss.mtx", "r");
    if (fp == NULL)
    {
        printf("ERROR! Unable to open the file ..\n");
        exit(1);
    }

    int linenum = 0;

    char *line = NULL;
    size_t linecap = 0;
    ssize_t linelen;
    while ((linelen = getline(&line, &linecap, fp)) > 0)
    {
        if (line[0] == '%')
            continue;
        else if (linenum == 0)
        {
            int xcnt, ycnt, count;
            sscanf(line, "%d %d %d", &xcnt, &ycnt, &count);
            printf("Xcount %d Ycount %d Count %d \n", xcnt, ycnt, count);
        }
        else
        {
            int x, y;
            float val;
            printf("Line: %s\n", line);
            sscanf(line, "%d %d %F", &x, &y, &val);
            printf("X %d Y %d Val %e\n", x, y, val);
        }
        linenum++;
    }

    free(line);
}
