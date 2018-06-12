const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const notes = require('./notes.js');
const myNotes = require('./mynotes.js');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let app = express();
//mLab database url here
let database = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB;

    app.use(express.static('public'));
    app.use(bodyparser.urlencoded({extended: true}));
    app.use(bodyparser.json());

function quickNotesApp(port){
    // eslint-disable-next-line no-console
    console.log("listening on port " + port);

    notes(app,bodyparser,database);
    myNotes(app,bodyparser,database);
    
    app.listen(port);
    
}

quickNotesApp(3000);