/********************************************************************************
* WEB322 – Assignment 06
* Name: Clinton Jacob Mariano  Student ID: 151449220
* Published URL: https://web322-a5-alpha.vercel.app/
********************************************************************************/

const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const app = express();
app.use(express.static(__dirname + '/public'));                  // css, images
app.set("view engine", "ejs");                       // ejs templates
app.use(express.urlencoded({ extended: true }));     // form data

const session = require("express-session");
app.use(session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890",
    resave: false,
    saveUninitialized: true
}));

require("dotenv").config();
app.set('views', __dirname + '/views');
const mongoose = require("mongoose");

const carSchema = new mongoose.Schema({
    model: String,
    imageUrl: String,
    rentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    returnDate: {
        type: String,
        default: ""
    }
});
const Car = mongoose.model("cars", carSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model("users", userSchema);

async function populateDatabase() {
    const count = await Car.countDocuments();
    if (count === 0) {
        await Car.insertMany([
            { model: 'Mazda MX-5', imageUrl: 'https://static1.topspeedimages.com/wordpress/wp-content/uploads/2023/09/resize_2016_mazda_mx-5-miata_dsc6396-24918-scaled.jpg', returnDate: '' },
            { model: 'Subaru BRZ', imageUrl: 'https://static1.topspeedimages.com/wordpress/wp-content/uploads/2023/08/subaru-brz-2022-1024-06.jpg', returnDate: '' },
            { model: 'Nissan 370Z', imageUrl: 'https://static1.topspeedimages.com/wordpress/wp-content/uploads/2023/09/2019-nissan-370z-heritage-edition.jpg', returnDate: '' },
            { model: 'Chevrolet Corvette', imageUrl: 'https://static1.topspeedimages.com/wordpress/wp-content/uploads/2023/09/1320869_1.jpeg', returnDate: '' },
            { model: 'Porsche Cayman', imageUrl: 'https://static1.topspeedimages.com/wordpress/wp-content/uploads/2023/10/porsche-cayman.jpg', returnDate: '' }
        ]);
        console.log("Car populated");
    } else {
        console.log("Cars already exist, skipping");
    }
}

const checkLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/');
    next();
};

app.get("/", (req, res) => {
    if (req.session.user) return res.redirect("/cars");
    return res.render("login.ejs", { error: null });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            const newUser = new User({ email, password });
            await newUser.save();
            req.session.user = { email, _id: newUser._id };
        } else {
            if (user.password !== password) {
                return res.render("login.ejs", { error: "Invalid password" });
            }
            req.session.user = { email: user.email, _id: user._id };
        }
        res.redirect("/cars");
    } catch (err) {
        console.error(err);
        res.render("login.ejs", { error: "An error occurred" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("/cars", checkLogin, async (req, res) => {
    try {
        const cars = await Car.find({});
        res.render("cars.ejs", { cars, userId: req.session.user._id });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
});

app.get("/book/:id", checkLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || car.rentedBy) return res.redirect("/cars");
        res.render("bookingForm.ejs", { car });
    } catch (err) {
        console.error(err);
        res.redirect("/cars");
    }
});

app.post("/book/:id", checkLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || car.rentedBy) return res.redirect("/cars");

        car.rentedBy = req.session.user._id;
        car.returnDate = req.body.date;
        await car.save();

        res.redirect("/cars");
    } catch (err) {
        console.error(err);
        res.redirect("/cars");
    }
});

app.post("/return/:id", checkLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || String(car.rentedBy) !== String(req.session.user._id)) {
            return res.redirect("/cars");
        }

        car.rentedBy = null;
        car.returnDate = "";
        await car.save();

        res.redirect("/cars");
    } catch (err) {
        console.error(err);
        res.redirect("/cars");
    }
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_CONNECTION_STRING);
        console.log("SUCCESS connecting to MongoDB");

        await populateDatabase();

        console.log("STARTING Express web server");
        app.listen(HTTP_PORT, () => {
            console.log(`server listening on: http://localhost:${HTTP_PORT}`);
        });
    } catch (err) {
        console.error("ERROR: connecting to MONGO database");
        console.error(err);
        console.log("Please resolve these errors and try again.");
    }
}

startServer();
