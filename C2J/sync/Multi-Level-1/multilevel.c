#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>

char* getId();
int getPayload();


char* nodeID;
int PROCESS_COUNT;  //number of data item points to process;



int main(int argc, char** argv){
    printf("C is running...\n");

    nodeID = getId();
    PROCESS_COUNT = getPayload();

    printf("My ID is %s\n", nodeID);

}
