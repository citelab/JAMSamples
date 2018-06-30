
void printMsg(char* );

jasync printRet(char *s)
{
    printf("Callback returned %s\n", s);
}


jasync trycallback()
{
    int i;
    for (i = 0; i < 3; i++)
    {
	jsleep(500);
	printMsg("hello from worker");
    }
}
  

int main(int argc, char *argv[])
{
    trycallback();
}
