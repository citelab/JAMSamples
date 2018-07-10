struct timespec tp;
clockid_t clk_id = CLOCK_MONOTONIC;

int fogtest();

jasync testFogPerf(char *cinfo)
{
    clock_gettime(clk_id, &tp);
    int res = fogtest();
    if (res < 0)
        printf("%s\t INF\n", cinfo);
    else
    {
        struct timespec tpp;
        clock_gettime(clk_id, &tpp);
        double x = ((tpp.tv_sec - tp.tv_sec) * 1000.0 + (tpp.tv_nsec - tp.tv_nsec)/1000000.0);
        printf("%s\t%f\t%d\n", cinfo, x, res);
    }
}


int main(int argc, char *argv[])
{
    return 0;
}
