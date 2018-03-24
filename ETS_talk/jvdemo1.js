jdata {
    float qlen1 as logger;
    float qlen5 as logger;
}

jview {
    page1 as page {
        disp1 is display {
            type: graph;
            title: 'Queuelength1sec';
            source: qlen1;
            options: "";
        }
    }
    page2 as page {
        disp2 is display {
            type: graph;
            title: 'Queuelength5sec';
            source: qlen5;
            options: "";
        }
    }
}
