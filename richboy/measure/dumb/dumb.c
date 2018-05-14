#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

int main(int argc, char** argv){
    printf("C is running...\n");

    printf("Number of arguments are: %d\n", argc);
    for(int i = 0; i < argc; i++){
        printf("Argument %d is %s\n", i, argv[i]);
    }

    return 0;
}