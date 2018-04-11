const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const notes = require('./notes.js');
const myNotes = require('./mynotes.js');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let app = express();
let database = "mongodb://localhost:3000/";

app.use(express.urlencoded({extended: true}));
app.use(express.json());

function quickNotesApp(port){

    console.log("listening on port " + port);
    app.use(express.static('public'));

    notes(app,database);
    myNotes(app,database);
    
    app.listen(port);
    
}

quickNotesApp(3000);