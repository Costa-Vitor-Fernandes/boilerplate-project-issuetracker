"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const expect = require("chai").expect;
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");

let app = express();

app.use("/public", express.static(process.cwd() + "/public"));

app.use(cors({ origin: "*" })); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Sample front-end
app.route("/:project/").get(function (req, res) {
  res.sendFile(process.cwd() + "/views/issue.html");
});

//Index page (static HTML)
app.route("/").get(function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});
const MONGO_URI = process.env.DB; // Sua variável de ambiente DB
let db;
const client = new MongoClient(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client
  .connect()
  .then(() => {
    db = client.db("issue-tracker"); // O padrão é o nome do BD na sua string de conexão
    console.log("MongoDB connected");
  })
  .catch((err) => console.error("Connection error", err));

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API
apiRoutes(app, client);

//404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404).type("text").send("Not Found");
});

//Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
  if (process.env.NODE_ENV === "test") {
    console.log("Running Tests...");
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log("Tests are not valid:");
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app; //for testing
