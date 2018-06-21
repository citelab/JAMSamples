

void callup();

jasync trycallup()
{
  while(1)
    {
      jsleep(200);
      callup();
    }
}

jasync logdata()
{
  int i = 100;
  while(1)
    {
      x = i++;
      jsleep(100);
    }
}


jasync getmsg()
{
  char *ll;
  while(1)
    {
      ll = y;
      printf("Here is the msg: %s\n", ll);
    }
}


int main(int argc, char *argv[])
{
  trycallup();
  logdata();
  getmsg();
}
