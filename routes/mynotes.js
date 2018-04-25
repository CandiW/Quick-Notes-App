//for getting notes from db
module.exports = (app,mongoUrl) => {

    let MongoDB = require('mongodb').MongoClient;

    app.get('/mynotes',function(req,res){

        MongoDB.connect(mongoUrl,function(err,db){

            db.collection('notes').find({}).toArray((err,docs) => {
                console.log(docs);
                res.status(200);
                res.send(docs);    
            });
        });
    
    });

}