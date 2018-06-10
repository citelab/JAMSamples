void processMatrix(int, jcallback);


void retcall(char *msg)
{
    printf("Return call: %s\n", msg);
}


int main()
{
    int rtype = 27;
    
    processMatrix(rtype, retcall);
}
