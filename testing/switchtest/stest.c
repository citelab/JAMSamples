
char *getNodeInfo();

jasync runtests()
{
    char *str;
    
    while (1)
    {
	str = getNodeInfo();
	printf("Talked to %s\n", str);
	jsleep(60);
    }
}


int main(int argc, char *argv[])
{
    runtests();
}
