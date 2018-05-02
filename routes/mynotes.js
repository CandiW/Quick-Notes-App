//for getting notes from db
module.exports = (app,bodyparser,mongoUrl) => {

    let MongoDB = require('mongodb').MongoClient;
    app.use(bodyparser.urlencoded({extended: false}));
    app.use(bodyparser.json());


    app.get('/mynotes',function(req,res){

        MongoDB.connect(mongoUrl,function(err,db){

            db.collection('notes').find({}).toArray((err,docs) => {
                res.status(200);
                res.send(docs);    
            });
        });
    
    });

}