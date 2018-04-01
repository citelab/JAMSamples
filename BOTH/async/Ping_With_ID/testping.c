
int myid = -1;

int getid();
void pingj(int num);

jasync doping() {
  if (myid > 0)
    pingj(myid);
}  


int main() {
  printf("Started...\n");
  myid = getid();
}
