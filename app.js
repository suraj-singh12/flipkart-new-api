let express = require('express');
let app = express();

let dotenv = require('dotenv');
dotenv.config();
let port = process.env.PORT || 8500;

let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
// let mongoUrl = process.env.MongoUrl;     // local url
let mongoUrl = process.env.MongoLiveUrl;
let db;

//middleware 
let cors = require('cors');
let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    // res.send('Express Server Default');
    res.send('<h1>Fkart API default</h1>')
});

// list all the APIs: mouse, clothes, etc
// http://localhost:9200/list-apis
// https://crazy-dove-yoke.cyclic.app/list-apis
app.get('/list-apis', (req, res) => {
    db.listCollections().toArray((err, collInfo) => {
        if (err) throw err;

        let arr = []
        for (c of collInfo)  // for of loop (used in arrays)
            arr.push(c.name);

        res.send(arr);
    });
});

// api to get `all items` of any itemType 
// http://localhost:9200/api/shirts
// https://crazy-dove-yoke.cyclic.app/api/shirts
app.get('/api/:itemName', (req, res) => {
    let itemName = req.params.itemName;
    db.collection(itemName).find().toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
})

// NOTE: /item, /filters return first 12 items by default

// api for search bar
// http://localhost:9200/item/clothes
// http://localhost:9200/item/clothes?itemId=12
// https://crazy-dove-yoke.cyclic.app/item/clothes
// https://crazy-dove-yoke.cyclic.app/item/clothes?itemId=12
app.get('/item/:itemName', (req, res) => {
    let itemName = req.params.itemName;
    let itemId = req.query.itemId;
    let query = {};
    if(itemId) {
        query = {item_id: Number(itemId)};
    }
    db.collection(itemName).find(query).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// api for details page, clicking on popularity will send item type to js/db 
// filter by popularity
// http://localhost:9200/filter/popularity/mouses
// http://localhost:9200/filter/popularity/refrigerators
// https://crazy-dove-yoke.cyclic.app/filter/popularity/mouses
// https://crazy-dove-yoke.cyclic.app/filter/popularity/refrigerators
app.get('/filter/popularity/:item', (req, res) => {
    let itemName = req.params.item;
    let query = {hidden_stars:{$gt: 4}};

    db.collection(itemName).find(query).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// filter by price
// http://localhost:9200/filter/price/bags
// http://localhost:9200/filter/price/bags?sort=-1
// https://crazy-dove-yoke.cyclic.app/filter/price/bags
// https://crazy-dove-yoke.cyclic.app/filter/price/bags?sort=-1
// https://crazy-dove-yoke.cyclic.app/filter/price/bags?lcost=50&hcost=1000
// https://crazy-dove-yoke.cyclic.app/filter/price/bags?sort=-1&lcost=50&hcost=1000
app.get('/filter/price/:item', (req, res) => {
    let itemName = req.params.item;

    let lcost = Number(req.query.lcost);
    let hcost = Number(req.query.hcost); 
    let query = {new_price:{$gt: 50}};

    if(lcost && hcost) 
        query = {new_price:{$gt: lcost, $lt: hcost}};
    else if(!lcost && hcost) 
        query = {new_price:{$gt: 50, $lt: hcost}};
    else if(lcost && !hcost)
        query = {new_price:{$gt: lcost}};
    
    
    let sort_order = {new_price: 1};        // -1 to sort in desc order
    if(req.query.sort) {
        sort_order = {new_price: Number(req.query.sort)};
    }
    
    db.collection(itemName).find(query).sort(sort_order).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    })
})

// filter by newest first
// http://localhost:9200/filter/new/bags
// http://localhost:9200/filter/new/keyboards
// https://crazy-dove-yoke.cyclic.app/filter/new/bags
// https://crazy-dove-yoke.cyclic.app/filter/new/keyboards
app.get('/filter/new/:item', (req, res) => {
    let itemName = req.params.item;
    let query = { $and:[{hidden_stars: {$lt:4.2 , $gt: 3.5}}] };       // my criteria defining 'what is new data'

    db.collection(itemName).find(query).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// filter by discount
// http://localhost:9200/filter/discount/mouses/70
// http://localhost:9200/filter/discount/powerbanks/50
// https://crazy-dove-yoke.cyclic.app/filter/discount/powerbanks/50
app.get('/filter/discount/:item/:dis', (req, res) => {
    let itemName = req.params.item;
    let discount = req.params.dis;

    let query = {discount:{$gt: Number(discount)}};
    db.collection(itemName).find(query).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// filter by customer-rating
// http://localhost:9200/filter/rating/bags/4
// http://localhost:9200/filter/rating/pillows/3
// https://crazy-dove-yoke.cyclic.app/filter/rating/pillows/3
app.get('/filter/rating/:item/:rating', (req, res) => {
    let itemName = req.params.item;
    let rating = req.params.rating;
    let query = {hidden_stars:{$gt: Number(rating)}};

    db.collection(itemName).find(query).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// filter by special-price (offers)
// http://localhost:9200/filter/offers/mouses
// https://crazy-dove-yoke.cyclic.app/filter/offers/mouses
app.get('/filter/offers/:item', (req, res) => {
    let itemName = req.params.item;
    let sort_order = {discount: -1}     // max discount first (i.e. less cost items) : offer!

    db.collection(itemName).find().sort(sort_order).toArray((err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// -----------------------------------------------------------------------------------------
// cart
// post, get_particular_user's, delete
/** structure (POST)        [in   /cart/add  send data in below format in body of postman as raw json]
 * item_type: string    [collection name]
 * item_id: number      [will be authenticated if exists or not]
 * name: string
 * email: string
 */
/** structure (GET)
 * email: string
 */
/** structure (Delete)
 * item_no: number
 * email: string
*/

// add to cart
// {
    // "image": "https://i.ibb.co/HpkT5G0/5f5c2646fccf.jpg",
    // "brand": "IDISI CLOTHES",
    // "description": "Unstitched Polycotton Shirt Fabric Printed",
    // "new_price": 249,
    // "old_price": 999,
    // "discount": 75,
    // "delivery_type": "Free delivery",
    // "hidden_stars": 3.9,
    // "item_id": 1,

    // "item_type": "clothes",
    // "name": "alpha1",
    // "email": "alpha1@alpha.com"
// }
// http://localhost:9200/cart/add
// https://crazy-dove-yoke.cyclic.app/cart/add
app.post('/cart/add', (req, res) => {
    let itemType = req.body.item_type;
    let itemId = req.body.item_id;
    let name = req.body.name;
    let emailId = req.body.email;
    if(!itemType || !itemId || !name || !emailId) {
        res.send('Invalid input type');
    } else {
        // check if item already exists in user's cart
        query = {email: emailId, item_id: itemId, item_type: itemType};
        db.collection('cart').find(query).toArray((err, result) => {
            if(result.length > 0) {
                res.send('item already present in cart');
            } 
            // if not exists then add
            else {
                db.collection('cart').insertOne(req.body, (err, result) => {
                    if(err) throw err;
                    // res.send(result);
                    res.send(`Item added with Object id: ${result.insertedId}`)
                })
            }
        })
    }
});

// fetch item from cart (based on email)
// http://localhost:9200/cart/get/alpha1@alpha.com
// https://crazy-dove-yoke.cyclic.app/cart/get/alpha1@alpha.com
app.get('/cart/get/:email', (req, res) => {
    let emailId = req.params.email;        // provide email in url
    let query = {email: emailId};

    db.collection('cart').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});
// fetch items from cart (all)
// http://localhost:9200/cart/getAll
// https://crazy-dove-yoke.cyclic.app/cart/getAll
app.get('/cart/getAll', (req, res) => {
    let query = {};
    db.collection('cart').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

// delete from cart
// http://localhost:9200/cart/delete/alpha1@alpha.com/mouses/58
// http://localhost:9200/cart/delete/alpha14@alpha.com/clothes/18
// http://localhost:9200/cart/delete/alpha14@alpha.com/keyboard/18
// https://crazy-dove-yoke.cyclic.app/cart/delete/alpha14@alpha.com/keyboard/18
app.delete('/cart/delete/:email/:item_type/:item_id', (req,res) => {
    let emailId = req.params.email;
    let itemType = req.params.item_type;
    let itemId = Number(req.params.item_id);
    db.collection('cart').deleteOne({email:emailId, item_id: itemId, item_type: itemType}, (err, result) => {
        if(err) throw err;
        // res.send(result);
        if(Number(result.deletedCount) === 0) {
            res.status(500).send('No such item exists!');
        } else {
            res.status(200).send(`Item no: ${itemId}, type: ${itemType}, of user ${emailId} deleted !\n Delete Count: ${result.deletedCount}`)
        }
    })
});



// ---------------------------------------------------------------
// wishlist  (same as cart)
// post, get_particular_user's, delete

// add to wishlist
// {
//     "image": "https://i.ibb.co/HpkT5G0/5f5c2646fccf.jpg",
//     "brand": "IDISI CLOTHES",
//     "description": "Unstitched Polycotton Shirt Fabric Printed",
//     "new_price": 249,
//     "old_price": 999,
//     "discount": 75,
//     "delivery_type": "Free delivery",
//     "hidden_stars": 3.9,
//     "item_id": 1,

//     "item_type": "clothes",
//     "name": "alpha1",
//     "email": "alpha1@alpha.com"
// }
// http://localhost:9200/wishlist/add
// https://crazy-dove-yoke.cyclic.app/wishlist/add
app.post('/wishlist/add', (req, res) => {
    let itemId = req.body.item_id;
    let itemType = req.body.item_type;
    let name = req.body.name;
    let emailId = req.body.email;
    if(!itemType || !itemId || !name || !emailId) {
        res.send('Invalid input type');
    } else {
        // check if item already exists in user's wishlist
        query = {email: emailId, item_id: itemId, item_type: itemType};
        db.collection('wishlist').find(query).toArray((err, result) => {
            if(result.length > 0) {
                res.send('Item already present in wishlist');
            } 
            // if not exists then add
            else {
                db.collection('wishlist').insertOne(req.body, (err, result) => {
                    if(err) throw err;
                    // res.send(result);
                    res.send(`Item added with Object id: ${result.insertedId}`)
                })
            }
        })
    }
});

// fetch item from wishlist (based on email)
// http://localhost:9200/wishlist/get/alpha1@alpha.com
// https://crazy-dove-yoke.cyclic.app/wishlist/get/alpha1@alpha.com
app.get('/wishlist/get/:email', (req, res) => {
    let emailId = req.params.email;        // provide email in url
    let query = {email: emailId};
    db.collection('wishlist').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

// fetch items from wishlist (all)
// http://localhost:9200/wishlist/getAll
// https://crazy-dove-yoke.cyclic.app/wishlist/getAll
app.get('/wishlist/getAll', (req, res) => {
    let query = {};
    db.collection('wishlist').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

// get item from wishlist by itemType & itemId
// http://localhost:9200/wishlist/getItemById/suraj@gmail.com/clothes/45
// https://crazy-dove-yoke.cyclic.app/wishlist/getItemById/suraj@gmail.com/clothes/45
app.get('/wishlist/getItemById/:emailId/:itemType/:itemId', (req, res) => {
    let emailId = req.params.emailId;
    let itemType = req.params.itemType;
    let itemId = req.params.itemId;

    let query = {email: emailId, item_type:itemType, item_id: itemId};
    db.collection('wishlist').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

// delete from wishlist
// http://localhost:9200/wishlist/delete/alpha1@alpha.com/mouses/58
// https://crazy-dove-yoke.cyclic.app/wishlist/delete/alpha1@alpha.com/mouses/58
app.delete('/wishlist/delete/:email/:item_type/:item_id', (req,res) => {
    let emailId = req.params.email;
    let itemType = req.params.item_type;
    let itemId = Number(req.params.item_id);
    db.collection('wishlist').deleteOne({email:emailId, item_type: itemType, item_id: itemId}, (err, result) => {
        if(err) throw err;
        // res.send(result);
        if(Number(result.deletedCount) === 0) {
            res.status(500).send('No such item exists!');
        } else {
            res.status(200).send(`Item no: ${itemId}, type: ${itemType}, of user ${emailId} deleted !\n Delete Count: ${result.deletedCount}`)
        }
    })
});

// ----------------------------------------------------------------
// orders
// post, get_particular_user's, get_all_items with count

// order made STRUCTURE
// {
//     "order_id": 51,
//     "item_id": 58,
//     "item_type": "mouses",
//     "amount" : 100,
//     "quantity": 1,
//     "total_amount": 100,
//     "name": "alpha1",
//     "email": "alpha1@alpha.com",
//     "phone": "1234567890",
//     "bank_name": "SBI",
//     "transaction_state": "In Process"
// }
// example2 
// {
// "order_id": 51,
// "item_id": 43,
// "item_type": "keyboards",
// "amount": 345,
// "quantity": 1,
// "total_amount": 345,
// "name": "alpha1",
// "email": "alpha3451@alpha.com",
// "phone": 9589658210,
// "bank_name": "SBI",                  // need not to pass
// "transaction_state": "Completed"     // need not to pass
// }
// http://localhost:9200/orders/add
// https://crazy-dove-yoke.cyclic.app/orders/add
app.post('/orders/add', (req, res) => {
    let orderId = req.body.order_id;
    // req.body.order_id = orderId;

    let itemId = req.body.item_id;
    let itemType = req.body.item_type;
    let amount = req.body.amount;
    let quantity = req.body.quantity;
    let totalAmount = req.body.total_amount;

    let name = req.body.name;
    let emailId = req.body.email;
    let phoneNo = req.body.phone;
    
    // let bankName = req.body.bank_name;
    let transactionState = req.body.transaction_state ? req.body.transaction_state : 'In Progress';
    req.body.transaction_state = transactionState;
    
    if(!itemId || !itemType || !amount || !quantity || !totalAmount || !name || !emailId || !phoneNo) {
        res.send('Incomplete input!');
    } else {
        db.collection('orders').insertOne(req.body, (err, result) => {
            if(err) throw err;
            // res.send(result);
            res.send(`Order made. Returned OrderId: ${orderId}`)
        })
    }
});

// fetch item from wishlist (based on email)
// http://localhost:9200/orders/get/alpha1@alpha.com
// https://crazy-dove-yoke.cyclic.app/orders/get/alpha1@alpha.com
app.get('/orders/get/:email', (req, res) => {
    let email = req.params.email;        // provide email in url
    let query = {email: email};

    db.collection('orders').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

// fetch items from wishlist (all)
// http://localhost:9200/orders/getAll
// https://crazy-dove-yoke.cyclic.app/orders/getAll
app.get('/orders/getAll', (req, res) => {
    let query = {};
    db.collection('orders').find(query).toArray((err, result) => {
        if(err) throw err;
        res.send(result);
    });
});


// update order status
// http://localhost:9200/orders/update/2575
// https://crazy-dove-yoke.cyclic.app/orders/update/2575
// {
// "transaction_state": "Completed",
// "date": "06-06-2022",
// "bank_name": "SBI"
// }
app.put('/orders/update/:order_id', (req, res) => {
    let orderId = req.params.order_id;
    db.collection('orders').updateOne(
        {order_id: orderId},
        {
            $set:{
                "transaction_state":req.body.transaction_state,
                "date":req.body.date,
                "bank_name":req.body.bank_name
            }
        }, (err, result) => {
            if(err) throw err;
            // res.send(result);
            res.status(200).send(`Order ${orderId} Updated`);
        }
    )
})


// update address
// http://localhost:9200/updateAddress?address=anand-vihar
// https://crazy-dove-yoke.cyclic.app/updateAddress?address=anand-vihar
app.put('/updateAddress/:email', (req, res) => {
    let email = req.params.email;
    let addr = req.query.address;
    db.collection('users').updateOne(   
        {email: email},
        {
            $set:{
                "address": addr
            }
        }, (err, result) => {
            if(err) throw err;
            res.status(200).send(`Address updated for ${email}`);
        }
    )
})


// connect to database
MongoClient.connect(mongoUrl, (err, client) => {
    if (err) console.log("Error while connecting");

    db = client.db('project2-live');

    app.listen(port, (err) => {
        if (err) throw err;
        console.log('Express server listening on port' + port);
        console.log('http://localhost:' + port);
    });
});

