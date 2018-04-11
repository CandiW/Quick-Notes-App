//posting notes to backend and storing in db
module.exports = (app,mongoUrl) => {

    let MongoDB = require('mongodb').MongoClient;
    
    app.post('/notes',function(req,res){
        //posting the note just fine, just not receiving the note text (says undefined)
        //not getting note text for some reason?? only returning the date...

        let text = req.body.text;
        //send response to append note to page
        //store note data in db
        let noteData = {
            text: text,
            date: new Date()
        };

        MongoDB.connect(mongoUrl,function(err,db){
       
                let notesCollection = db.collection('notes');
                notesCollection.insert(noteData);
                console.log(noteData);
                db.close();
        });

        res.status(201).json(noteData);

    });

}

//C:\Program Files\MongoDB\Server\3.4\bin