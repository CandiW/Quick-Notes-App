//for getting notes from db
module.exports = (app,bodyparser,mongoUrl) => {

    let MongoDB = require('mongodb').MongoClient;
    app.use(bodyparser.urlencoded({extended: false}));
    app.use(bodyparser.json());

//changes from mynotes to notes, trying posting and getting from same path....following
//a tutorial from HackerNoon on Medium

    app.get('/notes',function(req,res){

        MongoDB.connect(mongoUrl,function(err,db){

            if(err){ console.log(err); }

            db.collection('notes').find({}).toArray((err,docs) => {
                res.status(200);
                res.json(docs);    
            });
        });
    
    });

}