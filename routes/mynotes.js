//for getting notes from db
module.exports = (app,mongoUrl) => {

    let MongoDB = require('mongodb').MongoClient;

    app.get('/mynotes',function(req,res){

        MongoDB.connect(mongoUrl,function(err,db){

            let retrievedNotes = db.collection('notes').find();
            console.log(retrievedNotes);
            res.status(200);
            res.send(retrievedNotes);

        });
    
    });

}