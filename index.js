const port = process.env.PORT || 3000;
const path = require("path");
const http = require("http");
const bodyParser = require("body-parser");
const express = require("express");
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

require("dotenv").config({ path: path.resolve(__dirname, './.env') });

app.use(express.static(__dirname +  '/static'));

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended:false}));

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;

const apiKey = process.env.API_KEY;

const uri = `mongodb+srv://${userName}:${password}@cluster0.h8hwq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect(err => {
    if (err) {
        console.error(err);  
    } else {
        console.log("Connected to database successfully...");
    }
});

app.get("/", (request, response) => {
    response.render("home", { title: "Crush Compatability" });
});

app.get("/all-searches", async (request, response) => {
    try {
        let searches = await getAllSearchesFromDatabase();
        response.render("allSearches", { title: "All Searches", searches: searches });
    } catch (err) {
        console.error(err);
        response.render("error", { title: "Something Bad Happend" });
    }
});

app.post("/processCrushForm", async (request, response) => {
    let name = request.body.name;
    let crushName = request.body.crushName;

    try {
        const { fname, sname, percentage, result } = await getCompatabilityData(name, crushName);
        let formattedDate = Date().toLocaleString();
        let obj = { name: fname, crushName: sname, compatability: percentage, result: result, date: formattedDate };

        client.db(dbName).collection(collectionName).insertOne(obj);

        obj.title = "Results";
        response.render("results", obj);
    } catch (err) {
        console.error(err);
        response.render("error", { title: "Something Bad Happend" });
    }
});

async function getCompatabilityData(name, crushName) {
    const options = {
        method: 'GET',
        url: 'https://love-calculator.p.rapidapi.com/getPercentage',
        params: { fname: name, sname: crushName },
        headers: {
          'X-RapidAPI-Host': 'love-calculator.p.rapidapi.com',
          'X-RapidAPI-Key': apiKey
        }
      };

    return await axios.request(options).then(response => response.data);
}

async function getAllSearchesFromDatabase() {
    const query = {};

    let cursor = client.db(dbName)
    .collection(collectionName)
    .find(query)
    .sort({_id:-1});

    let arr = await cursor.toArray();
    return arr.map(search => { return { name: search.name, crushName: search.crushName, compatability: search.compatability, result: search.result, date: search.date }});
}

app.use(function(req, res){
    res.status(404).render("error", { title: "Page Not Found" });
});

http.createServer(app).listen(port, () => console.log(`Server running on port ${port}...`));




