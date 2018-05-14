function exam() {
//    var p = distributeExams();
//    console.log("Value of p ", p);
    var q = startExam();
    console.log("Value of q ", q);
    console.log('Started the exams');
}

setInterval(function() {
        exam();
        }, 2000);
