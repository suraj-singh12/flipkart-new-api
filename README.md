# flipkart-api

## how to use
Check API document `apiDocumentFlipkart.md`

## How To build on Local Machine

### Clone the repo to local machine
```git
git clone https://github.com/suraj-singh12/flipkart-api.git
```

### Install dependencies
```npm
npm install
```

### Create .env file with following structure
```code
PORT = 9200
MongoUrl = "mongodb://localhost:27017"
MongoLiveUrl = "your_live_db_url"
```

> Note: `your_live_db_url` would look like this: `mongodb+srv://<username>:<password>@cluster0.ecqfv.mongodb.net/?retryWrites=true&w=majority`

> Note: Check the database name in `app.js` and ensure you are connecting to correct database.

### Run the APP
```npm
npm start
```

### For Development
```npm
npm run dev
```
