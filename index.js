const express = require('express');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParcer = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
);
console.log(process.env.DB_USER);
app.use(express.json());
app.use(cookieParcer());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqe77mp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// const tokenVerify = (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log('value of token of middileware', token);
//   if (!token) {
//     return res.status(401).send({ message: 'token not found' });
//   }
//   jwt.verify(
//     token,
//     '1352ca5a2f672b286bbe6bd8dedf8d5ae52c0626c782b2c134587a668554fee4430896d4d66a804555319a322308da231f76e65556f4450f91c2952e8eb9f6e8',
//     (err, decode) => {
//       if (err) {
//         return res.status(401).send({ message: 'token not found' });
//       }
//       console.log('value in the token ', decode);
//     }
//   );
//   next();
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const collcationService = client.db('carDoctor').collection('service');
    const bookingCollection = client.db('carDoctor').collection('booking');
    //firebse auth server

    app.post('/jwt', async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    app.post('/logout', (req, res) => {
      const user = req.body;
      console.log('logout user', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });
    });

    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: 'aunauthorized acces' });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        if (err) {
          return res.status(401).send({ message: 'aunauthorized' });
        }
        req.user = decode;
        next();
      });
    };

    //service section
    app.get('/servicess', async (req, res) => {
      const qurey = collcationService.find();
      const result = await qurey.toArray();

      res.send(result);
    });

    app.use('/servicess/:id', async (req, res) => {
      const id = req.params.id;
      const qurey = { _id: new ObjectId(id) };

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1, facility: 1 },
      };
      const result = await collcationService.findOne(qurey, options);
      res.send(result);
    });
    //booking data is server
    app.get('/booking', verifyToken, async (req, res) => {
      console.log('this is cookei', req?.cookies?.token);
      let query = {};
      if (req.user?.email !== req.query?.email) {
        return res.status(403).send({ message: 'forbidden acces' });
      }
      if (req.query?.email) {
        query = { email: req.query?.email };
      }
      const booking = bookingCollection.find(query);
      const result = await booking.toArray();
      res.send(result);
    });

    app.post('/booking', async (req, res) => {
      const userInfo = req.body;
      const result = await bookingCollection.insertOne(userInfo);
      res.send(result);
    });
    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updates = req.body;
      const updateDucment = {
        $set: {
          status: updates.status,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDucment);
      res.send(result);
    });
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const qureys = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(qureys);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('thsi is car data server site is run');
});

app.listen(port, () => {
  console.log(`this is car server port is :${port}`);
});
