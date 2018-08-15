
jasync getdata() {

    printf("In getdata... \n");
    char *s;
    while(1) {
	s = mytag;
	printf("Value of mytag %s\n", s);
    }
}



int main(int argc, char *argv[])
{
    getdata();
}
