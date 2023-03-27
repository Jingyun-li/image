const express= require('express');
const multer = require('multer')
const app = express()
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }))
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.static(__dirname + '/public'));

app.listen(4000)

let storage = multer.diskStorage({
    destination:'./public/images', 
    filename:(req, file, cb)=>{
        cb(null, Date.now()+file.originalname)
    }
})

let upload = multer({
   storage: storage,
   fileFilter:(req, file, cb)=>{
        cb(null, true)
    }
})

app.post('/post', upload.single('upload'), async function (req, res) {
  const image = fs.readFileSync(req.file.path, { encoding: 'base64' });
  fs.unlinkSync(req.file.path);
  res.render('index');
  await insert({Image:image, Label:req.body.label});
});

app.get('/', (req, res)=>{
    res.render('index');
})

app.get('/upload', (req, res)=>{
  res.render('upload');
})

app.post('/', upload.single('croppedImage'), async function (req, res){
  const croppedImageDataUrl = req.body.croppedImage;
  console.log(croppedImageDataUrl);
  await update(croppedImageDataUrl);
  res.render('index');
});


app.get("/segmentation", async function (req, res) {
  let rst = await lookUp();
  if (rst == -1) {
    res.send('<h1>no photo need to be processed<\h1>');
  } else {
    res.render('segmentation', { imageUrl:rst.Image, label:rst.Label });
  }
});

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const data = process.env.MONGO_DB_NAME;
const coll = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${userName}:${password}@cluster0.whrrl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1});

async function insert(value) {
  await client.connect();
  const result = await client.db(data).collection(coll).insertOne(value);
}

async function lookUp() {
  await client.connect();
  let filter = { newImg: null};
  const result = await client.db(data).collection(coll).findOne(filter);
  if (result) {
    return result;
  } else {
    return -1;
  }
}

async function update(newValues) {
  let filter = { newImg: null};
  let update = { $set: {newImg: newValues }};
  const result = await client.db(data).collection(coll).updateOne(filter, update);
}