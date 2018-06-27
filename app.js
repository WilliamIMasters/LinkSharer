const express = require("express");
const app = express();
const session = require("express-session");
const ejs = require("ejs");
const url = require("url");
const bodyParser = require('body-parser');
const moment = require("moment");
const favicon = require("serve-favicon");
const sql = require("sqlite3").verbose();
const db = new sql.Database("db/posts.db");
const crypto = require("crypto");

const port = 80;

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/node_modules/bootstrap/dist"));
app.use(express.static(__dirname + "/node_modules/open-iconic"));
app.use(favicon(__dirname + "/Images/favicon.png"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
   secret: "batboi",
   resave: true,
   saveUninitialized: true
}));
app.listen(port);


app.get("/", function(req, res) {
   buildHomePage(req,res);
});
function buildHomePage(req,res) {
   db.all("SELECT * FROM post ORDER BY postTimeStamp DESC LIMIT 52;", function(err, rows) {
      if(err != null) {
         console.log("Database error getting data for front page: " + err);
      } else {
         rows.forEach(function(row) {
            row["fromNow"] = moment(row.postTimeStamp).fromNow();
         });
         res.render("homePage", {posts: rows, loginData: getLoginData(req)});
      }
   });
}


app.get("/upload", function(req, res, next) {
   if(req.session.username) {
      res.render("upload");
   } else {
      res.redirect("login");
   }

});
app.post("/upload", function(req, res) {
   let data = req.body;
   data.username = req.session.username.toString();
   if(validateData(data)) {
      uploadPostToDB(data);
   }
   res.send("data recived");
});


app.get("/search", function(req, res, next) {
   res.render("search");
});
app.post("/search", function(req,res) {
   let searchTerm = validateUserInput(req.body.searchTerm);
   db.all(`SELECT * FROM post WHERE title LIKE "%${searchTerm}%" ORDER BY postTimeStamp DESC LIMIT 52;`, function(err, rows) {
      if(err != null) {
         console.log("An error has occured getting data from the database: " + err);
         res.send("Database Error");
      } else {
         if(rows != null) {
            if(rows.length == 0) {
               res.send("No posts");
            } else {
               res.render("posts", {posts: getTimesFromNow(rows), loginData: getLoginData(req), title: ("Search: \"" + searchTerm + "\"")});
            }

            // let foundPosts = [];
            // rows.forEach(function(row) {
            //    console.log("row: " + row);
            //    foundPosts.push(row);
            // });
            // if(foundPosts.length == 0) {
            //    res.send("No post found");
            // } else {
            //    res.send(foundPosts);
            // }
         } else {
            req.send("No posts found");
         }
      }
   });
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
            res.render("post", {title: row.title, desc: row.desc, link: row.link, username: row.username, displayName: row.displayName, loginData: getLoginData(req)}); //row.id + row.image
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

app.get("/user/:username", function(req, res) {
   db.get(`SELECT * FROM Users WHERE username = "${req.params.username}";`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting a user's data from the database: " + err);
         res.render("500error");
      } else {
         if(row != null) {
            db.all(`SELECT * FROM post WHERE username = "${req.params.username}" ORDER BY postTimeStamp DESC LIMIT 4;`, function(err, rows) {
               if(err != null) {
                  console.log("An error has occured getting a users recent posts from the database: " + err);
                  res.render("500error");
               } else {
                  if(rows != null && rows.length > 0) {
                     rows.forEach(function(row) {
                        row["fromNow"] = moment(row.postTimeStamp).fromNow();
                     });
                     res.render("profile", {displayName: row.displayName, username: row.username, bio: row.bio, loginData: getLoginData(req), recentPosts: rows});
                  } else {
                     res.render("profile", {displayName: row.displayName, username: row.username, bio: row.bio, loginData: getLoginData(req), recentPosts: null});
                  }
               }
            });
         } else {
            console.log("Null user: " + row);
            res.send("user does not exist");
         }
      }
   });
});

app.get("/user/:username/posts",function(req,res) {
   db.all(`SELECT * FROM post WHERE username = "${req.params.username}" ORDER BY postTimeStamp DESC LIMIT 52`, function(err, rows) {
      if(err != null) {
         console.log("An error has occured getting a all of a users posts from the database: " + err);
         res.render("500error");
      } else {
         if(rows.length == 0) {
            res.render("posts", {title: (req.params.username + "s posts"), posts: null, loginData: getLoginData(req)});
         } else {
            //res.render("posts", {title: (req.params.username + "s posts"), posts: getTimesFromNow(rows), loginData: getLoginData(req)});
            res.render("posts", {posts: getTimesFromNow(rows), loginData: getLoginData(req), title: (req.params.username + "'s posts")});
         }
      }
   });
   //res.render("posts", {title: (req.params.username + "'s posts")});
});


app.get("/login", function(req,res) {
   if(req.session.username) {
      res.send("Already logged in");
   } else {
      res.render("login");
   }
});

app.post("/login", function(req,res) {
   db.get(`SELECT * FROM users WHERE username = "${req.body.username}"`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting data from the database: " + err);
         res.render("500error");
      } else {
         if(row != null) {
            // console.log(hashPassword(req.body.password));
            // console.log(row.password);
            if(hashPassword(req.body.password) == row.password) { // successfully logged in
               req.session.username = row.username;
               res.redirect("/");
            } else { // Incorrect password
               res.render("login",{error: "Invalid password"});
            }
         } else { // Incorrect username
            res.render("login", {error: "Invalid username"});
         }
      }
   });
});

app.get("/logout", function(req,res) {
   req.session.destroy(function(err) {
      if(err) {
         res.negotiate(err);
      }
      res.redirect("/");
   });
});

app.get("/register", function(req,res) {
   res.render("register");
});
app.post("/register", function(req,res) {
   let data = validateUserInput(req.body);
   db.get(`SELECT username FROM users WHERE username="${data.username}"`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting data from the database: " + err);
         res.render("500error");
      } else {
         if(row != null) {
            res.render("register", {error: "Username has been taken"});
         } else {
            uploadUserToDB(data);
            res.redirect("/");
         }
      }
   });
   //
});

app.get("/editAccount", function(req,res) {
   if(getLoginData(req).loggedIn) {
      db.get(`SELECT * FROM users WHERE username = "${req.session.username}";`, function(err, row) {
         if(err != null) {
            console.log("An error has occured getting data from the database: " + err);
            res.render("500error");
         } else {
            if(row != null) {
               res.render("editProfile", {displayName: row.displayName,bio: row.bio});
            }
         }
      });
   } else {
      res.redirect("/login");
   }
});
app.post("/editAccount", function(req,res) {
   db.get(`SELECT * FROM users WHERE username = "${req.session.username}";`, function(err, row) {
      if(err != null) {
         console.log("An error has occured getting data from the database: " + err);
         res.render("500error");
      } else {
         if(row != null) {
            // console.log(req.body.passwordConfirm);
            if(hashPassword(req.body.passwordConfirm) == row.password) {
               if(req.body.newBio.length > 0) {
                  db.run(`UPDATE users SET bio = "${req.body.newBio}" WHERE username="${req.session.username}";`);
               }
               if(req.body.newDisplayName.length > 0) {
                  db.run(`UPDATE users SET displayName = "${req.body.newDisplayName}" WHERE username="${req.session.username}";`);
               }
               res.redirect(`/user/${req.session.username}`);
            } else {
               res.render("/editAccount", {error: "Incorrect Password"});
            }
         }
      }
   });
});

// Must be last
app.all("*", function(req,res) {
   res.render("404Error");
});



function validateData(data) {
   return true;
}

function validateUserInput(data) {
   return data;
}

function uploadPostToDB(data) {
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
   db.run(`INSERT INTO post (postid, title, link, desc, username, postTimeStamp, upVotes, downVotes) VALUES ("${id}", "${title}", "${link}", "${desc}", "${data.username}", "${timeStamp}", "${upVotes}", "${downVotes}")`);
}

function uploadUserToDB(data) {
   db.run(`INSERT INTO users (username, displayName, password) VALUES ("${data.username}", "${data.username}", "${hashPassword(data.password)}")`);
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

function hashPassword(password) {
   let hash = crypto.createHash("sha256");
   hash.update(password);
   return hash.digest("hex");
}

function getLoginData(req) {
   let loginData = {loggedIn: false};
   if(req.session.username) {
      loginData = {loggedIn: true, username: req.session.username};
   }
   return loginData;
}

function getTimesFromNow(rows) {
   rows.forEach(function(row) {
      row["fromNow"] = moment(row.postTimeStamp).fromNow();
   });
   return rows;
}
