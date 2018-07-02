jdata {
    float qlen1 as logger;
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
}
