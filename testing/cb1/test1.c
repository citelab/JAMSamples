
void printMsg(char*, jcallback);

void printRet(char *s)
{
    printf("Callback returned %s\n", s);
}


jasync trycallback()
{
    int i;
    for (i = 0; i < 3; i++)
    {
	jsleep(500);
	printMsg("hello from worker", printRet);
    }
}
  

int main(int argc, char *argv[])
{
    trycallback();
}
