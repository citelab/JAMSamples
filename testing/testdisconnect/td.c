
int getId();

jasync probeid()
{
    int x;
    
    while(1)
    {
	jsleep(200);
	x = getId();
	printf("ID value %d\n", x);
    }
}

int main(int argc, char *argv[])
{
    probeid();
}
