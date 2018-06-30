jasync localme(int c, char *s)
{
  while(1)
    {
      jsleep(20);
      printf("Message from me: %d, %s\n", c, s);
    }
}

jasync localyou(int c, char *s)
{
  while(1)
    {
      jsleep(100);
      printf("Message from you  %d, %s\n", c, s);
    }
}

int main(int argc, char *argv[])
{
  localme(10, "my message");
  localyou(100, "your message");  

}
