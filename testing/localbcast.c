

jasync localme(int c, char *s)
{
  while(1)
    {
      jsleep(100);
      printf("############-->>> Hello  ME  %d, %s\n", c, s);
    }
}


jasync localyou(int c, char *s)
{
  while(1)
    {
      jsleep(1000);
      printf("############-->>> Hello YOU  %d, %s\n", c, s);
    }
}


jasync checkx()
{
  char *msg;
  while(1)
    {
      msg = x;
      printf("%s\n", msg);
    }
}


jasync checky()
{
  char *msg;
  while(1)
    {
      msg = y;
      printf("%s\n", msg);
    }
}


int main(int argc, char *argv[])
{

  localme(10, "cxxxxxxxx");
  localyou(10, "cxxxxxxxx");  

  checkx();
  checky();

}
