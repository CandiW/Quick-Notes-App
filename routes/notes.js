//posting notes to backend and storing in db
module.exports = (app,bodyparser,mongoUrl) => {

    
    let MongoDB = require('mongodb').MongoClient;
    app.use(bodyparser.urlencoded({extended: false}));
    app.use(bodyparser.json());
    
  app.post('/notes',function(req,res){
        //posting the note just fine, just not receiving the note text (says undefined)
        //not getting note text for some reason?? only returning the date...

        //send response to append note to page
        //store note data in db
        
        let noteData = {
            text: req.body.text,
            date: new Date().toDateString()
        };
        console.log(req.body);
        MongoDB.connect(mongoUrl,function(err,db){
            
            if(err){console.log(err);}

                let notesCollection = db.collection('notes');
                notesCollection.insert(noteData);
                db.close();
        });

        res.set('Content-Type', 'Application/json');
        res.send(noteData);

    });


//C:\Program Files\MongoDB\Server\3.4\bin


}