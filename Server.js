/**
 * Created by satyasumansaridae on 3/10/17.
 */
var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    methods = require('methods'),
    express = require('express');
var bodyParser = require('body-parser');


var admin = require('firebase-admin');
var serviceAccount = require("./firebase-config/homeo-ui-firebase-adminsdk-q6osl-3714d78eff.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://homeo-ui.firebaseio.com"
});


// Create global app object
var app = express();
app.use(bodyParser.json());


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.options('/updatePatientData', function (req, res) {
    res.sendStatus(200)
});
app.options('/appointments/create', function (req, res) {
    res.sendStatus(200)
});
app.options('/appointments/delete', function (req, res) {
    res.sendStatus(200)
});

app.get("/appointments/byDate", function (req, res) {
    var dateQueryString = getVisitByDateKey();
    admin.database().ref('/VisitsByDate/' + dateQueryString).orderByChild('date').once('value').then(function (snapshot) {
        res.send(JSON.stringify(snapshot));
        console.log("Finished visits info request");
    });
});

app.post("/appointments/delete", function (req, res) {
    var appointmentToDelete = req.body;
    var dateQueryString = getVisitByDateKey();
    admin.database().ref('/VisitsByDate/' + dateQueryString).orderByChild('date').once('value').then(function (snapshot) {
        var snapshotRef = snapshot.val();
        var updatedAppointmentsData = snapshotRef.filter(function (value, index) {
            console.log(appointmentToDelete.assignedId, value.assignedId);
            return (appointmentToDelete.assignedId != value.assignedId)
        });
        admin.database().ref('/VisitsByDate/' + dateQueryString).set(updatedAppointmentsData).then(function () {
            res.send(200);
        });
    });

    admin.database().ref('/VisitsByPatient/' + appointmentToDelete.assignedId).orderByChild('date').once('value').then(function (snapshot) {
        var snapshotRef = snapshot.val();
        var dateString = (new Date()).toDateString();
        var updatedAppointmentsData = snapshotRef.filter(function (value, index) {
            console.log(dateString, value.date);
            return (dateString != value.date)
        });
        console.log(JSON.stringify(updatedAppointmentsData));
        admin.database().ref('/VisitsByPatient/' + appointmentToDelete.assignedId).set(updatedAppointmentsData).then(function () {
            res.send(200);
        });
    })
});

function getVisitByDateKey() {
    var dateString = (new Date()).toDateString();
    return dateString.replace(/ /g, "-").toUpperCase();
}
app.post("/appointments/create", function (req, res) {
    var appointmentsInfo = req.body;
    var assignedId = appointmentsInfo['assignedId'];
    var visitByDateKey = getVisitByDateKey();
    var appointmentObj = {
        "assignedId": assignedId,
        "firstName": appointmentsInfo['firstName'],
        "date": (new Date()).toDateString(),
        "reasonForVisit": "",
        "prescription": ""
    };

    var appointmentRef = admin.database().ref('/VisitsByDate/' + visitByDateKey);
    appointmentRef.once('value', function (snapshot) {
        var appointmentArray = [];

        if (snapshot.val() === null) {
            /**
             * If the record does not exist create one
             */
            appointmentArray.push(appointmentObj);
            console.log("Record not found creating one");
        } else {
            appointmentArray = snapshot.val();
            appointmentArray.push(appointmentObj);
        }
        admin.database().ref('/VisitsByDate/' + visitByDateKey).update(appointmentArray).then(function () {
            res.send(200);
        });
    });


    var appointmentRef = admin.database().ref('/VisitsByPatient/' + assignedId);
    appointmentRef.once('value', function (snapshot) {
        var appointmentArray = [];

        if (snapshot.val() === null) {
            /**
             * If the record does not exist create one
             */
            appointmentArray.push(appointmentObj);
            console.log("Record not found creating one");
        } else {
            appointmentArray = snapshot.val();
            appointmentArray.push(appointmentObj);
        }
        admin.database().ref('/VisitsByPatient/' + assignedId).update(appointmentArray).then(function () {
            res.send(200);
        });
    });

});

app.post("/updatePatientData", function (req, res) {
    var updatedInfo = req.body;
    var assignedId = updatedInfo.assignedId;
    admin.database().ref('/PatientInfo/' + assignedId).update(updatedInfo).then(function () {
        res.sendStatus(200);
    }).catch(function () {
        res.sendStatus(500);
    })
});

app.get("/patientsInfo", function (req, res) {
    admin.database().ref('/PatientInfo').orderByChild('assignedId').once('value').then(function (snapshot) {
        res.send(JSON.stringify(snapshot));
        console.log("Finished patients info request");
    });
});

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// finally, let's start our server...
var server = app.listen(process.env.PORT || 3001, function () {
    console.log('Listening on port ' + server.address().port);
});