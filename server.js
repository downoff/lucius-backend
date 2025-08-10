require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const Share = require('./models/Share'); // <-- NEW

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
const whitelist = ['https://www.ailucius.com', 'http://localhost:5173', 'http://localhost:5174'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  }
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_lucius_final', 
    resave: false, 
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Database & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- PUBLIC ROUTES ---
// ... (Your existing public routes for demo, free tools, etc.)

// --- NEW "SHOWROOM" ROUTE ---
app.get('/api/public/share/:shareId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId, public: true }).lean();
    if (!share) return res.status(404).json({ message: 'Content not found.' });
    Share.updateOne({ _id: share._id }, { $inc: { views: 1 } }).catch(()=>{});
    return res.json({ share });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// --- PRIVATE (AUTHENTICATED) ROUTES ---
// (We will upgrade the AI routes in the next step to use this)
// ... (All your existing private routes for auth, billing, etc.)

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});