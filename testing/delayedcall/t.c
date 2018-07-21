
jasync delayedcall()
{
    jsleep(200);
    printf("This is should be printed late\n");

}

jasync notdelayedcall()
{
    printf("No delay here\n");
}



int main(int argc, char *argv[])
{

}
