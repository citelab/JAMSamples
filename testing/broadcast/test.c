
jasync getbcast() {

    char *m;
    
    while(1) {
	m = mymsg;
	printf("Got the message: %s\n", m);
    }
}


int main(int argc, char *argv[]) {

    getbcast();
}
