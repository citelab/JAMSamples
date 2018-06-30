
jasync callworker(int x, jcallback q)
{
    printf("Value %d\n", x);
    q("message to controller");
}



int main(int argc, char *argv[])
{
    // Empty main
}
