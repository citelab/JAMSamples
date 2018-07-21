
jasync showbcast()
{
    char *str;
    
    while (1)
    {
	str = mytag;
	printf("My Tag is %s\n", str);
    }
}


int main(int argc, char *argv[])
{
    showbcast();
}
