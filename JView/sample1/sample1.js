jdata {
    float temp as logger;
    int pos as logger;
    int slid as broadcaster;
    int bTon as broadcaster;
}

jview {
    page1 as page {
        disp1 is display {
            type: graph;
            title: 'Temperature';
            source: temp;
            options: 'blah blah';
        }
    }
    page2 as page {
        disp2 is display {
            type: graph;
            title: 'Position';
            source: pos;
            options: "blah2 blah2";
        }
    }
    page3 as page {
        disp3 is controller {
            type: slider;
            title: 'slidy';
            options: 'blah';
            sink: slid;
        }
    }
    page4 as page {
        disp4 is controller {
            type: button;
            title: 'butty';
            options: 'blah';
            sink: bTon;
        }
    }
}
