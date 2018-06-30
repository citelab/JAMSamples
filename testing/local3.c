jasync localme(int c, char *s)
{
  while(1)
    {
      jsleep(200);
      printf("Message for me: %d, %s\n", c, s);
    }
}


int main(int argc, char *argv[])
{
  printf("Calling nothing...");

}
