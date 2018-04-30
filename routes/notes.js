//posting notes to backend and storing in db
module.exports = (app,mongoUrl) => {

    const bodyparser = require('body-parser');

    let MongoDB = require('mongodb').MongoClient;
    app.use(bodyparser.urlencoded({extended: true}));

    app.post('/notes',function(req,res){
        //posting the note just fine, just not receiving the note text (says undefined)
        //not getting note text for some reason?? only returning the date...

        //send response to append note to page
        //store note data in db
        let noteData = {
            text: req.body.name,
            date: new Date().toDateString()
        };

        MongoDB.connect(mongoUrl,function(err,db){
       
                let notesCollection = db.collection('notes');
                notesCollection.insert(noteData);
                // eslint-disable-next-line no-console
                console.log(noteData);
                db.close();
        });

        res.status(201).send(noteData);

    });

}

//C:\Program Files\MongoDB\Server\3.4\bin