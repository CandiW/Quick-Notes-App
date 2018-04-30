const express = require('express');
const path = require('path');
const notes = require('./notes.js');
const myNotes = require('./mynotes.js');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let app = express();
let database = "mongodb://localhost:3000/";

function quickNotesApp(port){
    // eslint-disable-next-line no-console
    console.log("listening on port " + port);
    app.use(express.static('public'));

    notes(app,database);
    myNotes(app,database);
    
    app.listen(port);
    
}

quickNotesApp(3000);