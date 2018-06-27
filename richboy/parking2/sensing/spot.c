#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

int isFogRunning();
//char* getLabel(int);
//char* getPostcode(int);
//char* getAddress(int);
char* getStreamKey(int);

char* label;
char* status = "free";
char* postcode;
char* address;
char* key; //would be obtained using C->J

const int PARKING_DURATION = 60;//60 minutes


int lot_id;
int spot_id;
int number_of_spots;
char* address;
char* facility_name;
char* facility_type;
char* weekday_allowed_time;
char* saturday_allowed_time;
char* sunday_allowed_time;
float rate_1hr;
float rate_2hr;
float rate_3hr;
float rate_allday;
int is_for_disabled;    //TODO NOT USED YET
double longitude;
double latitude;
char* occupancy_status;
char* occupancy_car;


void doLog(){
    spot = {.lotID:lot_id, .spotID:spot_id, .label:label, .address:address, .facilityName:facility_name,
    .facilityType:facility_type, .weekdayAllowedTime:weekday_allowed_time, .saturdayAllowedTime:saturday_allowed_time,
    .sundayAllowedTime:sunday_allowed_time, .rate1hr:rate_1hr, .rate2hr:rate_2hr, .rate3hr:rate_3hr,
    .rateAllday:rate_allday, .isForDisabled:is_for_disabled, .latitude:latitude, .longitude:longitude,
    .occupancyStatus:occupancy_status, .occupancyCar:occupancy_car, .key:key};
}

//get properties from the lots file and build
void buildProps(){
    FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./lots_translated.txt", "r");
    if (fp == NULL){
        printf("Unable to read the parking lots data file\n");
        return;
    }


    int id = 0;
    int total = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        id++;

        if( id == lot_id ){ //no need to skip the header line cause the id starts at 2
            //split line and get parts
            char* p = strtok(line, "@");
            p = strtok (NULL, "@");
            address = p;
            p = strtok (NULL, "@");
            number_of_spots = atoi(p);
            p = strtok (NULL, "@");
            facility_name = p;
            p = strtok (NULL, "@");
            facility_type = p;
            p = strtok (NULL, "@");
            weekday_allowed_time = p;
            p = strtok (NULL, "@");
            saturday_allowed_time = p;
            p = strtok (NULL, "@");
            sunday_allowed_time = p;
            p = strtok (NULL, "@");
            rate_1hr = atof(p);
            p = strtok (NULL, "@");
            rate_2hr = atof(p);
            p = strtok (NULL, "@");
            rate_3hr = atof(p);
            p = strtok (NULL, "@");
            rate_allday = atof(p);
            p = strtok (NULL, "@");
            latitude = atof(p);
            p = strtok (NULL, "@");
            longitude = atof(p);

            occupancy_status = "free";
            occupancy_car = "";
            is_for_disabled = 0;

            char pack[50];
            snprintf(pack,sizeof(pack),"Lot %d - Spot %d", lot_id, spot_id);
            label = &pack[0];

            break;
        }
    }

    fclose(fp);
    if (line)
        free(line);
}

int main(){//int argc, char **argv
    printf("C is running...\n");
    srand(time(NULL));


    //get lotID and spotID from dev_tag
    char* p = strtok(dev_tag, "_");
    lot_id = atoi(p);
    p = strtok(NULL, "_");
    spot_id = atoi(p);

    //read file and get spot properties
    buildProps();


    //temporarily set the key to null. will be ignored on the upper levels
    key = "null";

    doLog();  //log first so that the jside can see the log and get the stream key

    //now request for the stream key
    key = getStreamKey(spot_id);
    while (jam_error != 0 || strncmp(key, "null", 4) == 0 ) {
        usleep(2000);
        key = getStreamKey(spot_id);
        printf("Key received is: %s \n", key);
    }
    printf("Spot ID is: %d, Stream Key is: %s\n", spot_id, key);

    doLog();  //now do a proper log with the key
    doLog();
    doLog();

    return 0;
}


jasync changeState(char* status, char* car, int spotID, int lotID) {
    if( spot_id != spotID || lot_id != lotID )
        return;

	occupancy_status = status;
	occupancy_car = car;

	doLog();
}