#include <unistd.h>
#include <stdlib.h>

int main() {
	int temp;
	float hum, wind;

	for (int i = 1;; i++) {
		
		temp  = rand()%15+15;
		hum  = (rand()%100)/100;
		wind = rand()%25+(rand()%10)/10;

		MTLWeather = {
			.temperature: temp, 
			.humidity: hum,
			.wind: wind,
			.airQuality: "good",
			.UV: "strong"
		};

		sleep(1);
	}
}