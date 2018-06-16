const express = require("express");
const app = express();
const ejs = require("ejs");
const url = require("url");
const bodyParser = require('body-parser');
const moment = require("moment");
const favicon = require("serve-favicon");
const sha = require("crypto-js/sha256");

const sql = require("sqlite3").verbose();
const db = new sql.Database("db/posts.db");

const port = 80;

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/node_modules/bootstrap/dist"));
app.use(express.static(__dirname + "/node_modules/open-iconic"));
app.use(favicon(__dirname + "/Images/favicon.png"));
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(port);


app.get("/", function(req, res) {
   buildHomePage(req,res);
});
function buildHomePage(req,res) {
   db.all("SELECT * FROM post ORDER BY postTimeStamp DESC LIMIT 52;", function(err, rows) {
      if(err != null) {
         console.log("Database error getting data for front page: " + err);
      } else {
         //console.log(rows);
         rows.forEach(function(row) {
            row["fromNow"] = moment(row.postTimeStamp).fromNow();
         });
         res.render("homePage", {posts: rows});
      }
   });


}


app.get("/upload", function(req, res, next) {
   res.render("upload");
});

app.get("/search", function(req, res, next) {
   res.render("search");
});

app.post("/upload", function(req, res) {
   //console.log(req.body);
   let data = req.body;
   if(validateData(data)) {
      uploadToDB(data);
   }
   res.send("data recived");
});


app.get("/post/:id", function(req, res) {
   db.get(`SELECT post.*, Users.displayName FROM post INNER JOIN Users on post.username = users.username WHERE postid = "${req.params.id}";`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting data from the database: " + err);
         res.send("Database Error");
      } else {
         if(row != null) {
            //console.log("ROW: " + row);
            //console.log(`Title: ${row.title}, Desc: ${row.desc}, link: ${row.link}`);
            res.render("post", {title: row.title, desc: row.desc, link: row.link, username: row.username, displayName: row.displayName}); //row.id + row.image
         } else {
            get404HTML(req,res);
            console.log("row is null");
         }
      }
   });
});

app.get("/random", function(req, res) {
   db.get("SELECT postid FROM post ORDER BY random() LIMIT 1;", function(err, row) {
      if(err != null) {
         console.log("An error has occured getting a random row from the database: " + err);
         res.render("500error");
      } else {
         res.redirect("/post/" + row.postid);
      }
   })
});

app.get("/profile/:username", function(req, res) {
   db.get(`SELECT * FROM Users WHERE username = "${req.params.username}";`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting a user's data from the database: " + err);
         res.render("500error");
      } else {
         if(row != null) {
            res.render("profile", {displayName: row.displayName, username: row.username, bio: row.bio});
            // console.log(row);
         } else {
            console.log("Null user: " + row);
            res.send("user does not exist");
         }
      }
   });


   //res.render("profile", {displayName: "test", username: req.params.username, bio: "test2"});
});

app.get("/login", function(req,res) {
   res.render("login");
});

app.post("/login", function(req,res) {
   let data = req.body;
   console.log(data);
   res.send("test");
   // setTimeout(function() {
   //    res.send("test2");
   // }, 5000);
});

app.get("/test", function(req, res) {
   res.render("postTest");
});

// Must be last
app.all("*", function(req,res) {
   get404HTML(req,res);
});

function get404HTML(req,res) {
   res.render("404Error");
}


function validateData(data) {
   return true;
}

function uploadToDB(data) {
   let id="";

   do {
      id = generateRandomID();
      //console.log("id: " + id);
   } while((checkPostExists(id)));

   let title = data.title;
   let link = data.link;
   let desc = data.desc;
   let timeStamp = Date.now();
   let upVotes = 0;
   let downVotes = 0;
   db.run(`INSERT INTO post (postid, title, link, desc, postTimeStamp, upVotes, downVotes) VALUES ("${id}", "${title}", "${link}", "${desc}", "${timeStamp}", "${upVotes}", "${downVotes}")`);
}

function generateRandomID(){
   let randomID = "";
   let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   for(let i=0; i < 10; i++) {
      randomID += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return randomID;
}

function checkPostExists(id) {
      return false;
}

async function checkPostExistsDB(id) {

}
