
jasync dologging()
{
    int num = 1;
    while (1)
    {
	y = num++;
	jsleep(90);
    }
}


int main(int argc, char *argv[])
{
    dologging();
}
