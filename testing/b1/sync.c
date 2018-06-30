
int getID();

int myid = -1;

jasync trygetid()
{
    while(1)
    {
	jsleep(10);
	myid = getID();
	printf("MyID %d\n", myid);
    }
}


jsync int tellid()
{
    return myid;
}

int main(int argc, char *argv[])
{
    trygetid();
}
