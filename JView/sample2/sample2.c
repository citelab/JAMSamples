#include <stdlib.h>

int main() {

    while (1) {
        float q = rand() % 100 + 0.1 * (rand() % 10);
        temp = q;
	float p = rand() % 100 * 0.1;
	pos = p;
	//	printf("temp = %f, pos = %d\n", q, p);
        sleep(5);
    }
}
