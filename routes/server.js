const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const notes = require('./notes.js');
const myNotes = require('./mynotes.js');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let app = express();
let database = "mongodb://localhost:3000/";

    app.use(express.static('public'));
    app.use(bodyparser.urlencoded({extended: false}));
    app.use(bodyparser.json());

function quickNotesApp(port){
    // eslint-disable-next-line no-console
    console.log("listening on port " + port);

    notes(app,bodyparser,database);
    myNotes(app,bodyparser,database);
    
    app.listen(port);
    
}

quickNotesApp(3000);