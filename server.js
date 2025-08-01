/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work and completed based on my
* current understanding of the course concepts.
*
* The assignment was completed in accordance with:
* a. The Seneca's Academic Integrity Policy
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* b. The academic integrity policies noted in the assessment description
*
* I did NOT use generative AI tools (ChatGPT, Copilot, etc) to produce the code
* for this assessment.
*
* Name: __Clinton Jacob Mariano__ Student ID: _151449220_
*
* Published URL: https://web322-a5-alpha.vercel.app/
*
********************************************************************************/
const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const app = express();
app.use(express.static(__dirname + '/public'));  // css files
app.set('views', __dirname + '/views');     //ejs
app.use(express.urlencoded({ extended: true })); //forms


// setup sessions
const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
   resave: false,
   saveUninitialized: true
}))

require("dotenv").config()   
const mongoose = require('mongoose')

// TODO: Put your model and schemas here
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
})
const Car = mongoose.model("cars", carSchema)

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})
const User = mongoose.model("users", userSchema)

const ensureLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
}

app.get("/", async (req, res) => {  
    if(req.session.user) {
        return res.redirect('/cars');
    }
    return res.render("login.ejs", { error: null });
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                password
            });
            await user.save();
        } else {
            if (user.password !== password) {
                return res.render("login.ejs", { error: "Invalid password" });
            }
        }

        req.session.user = {
            email: user.email,
            _id: user._id
        };

        res.redirect("/cars");
    } catch (error) {
        console.error(error);
        res.render("login.ejs", { error: "An error occurred" });
    }
})

app.get("/logout", async (req, res) => {
    req.session.destroy();
    return res.redirect("/")
})

app.get("/cars", ensureLogin, async (req, res) => {  
    try {
        const cars = await Car.find({});
        return res.render("cars.ejs", { 
            cars, 
            userId: req.session.user._id 
        });
    } catch (error) {
        console.error(error);
        return res.redirect("/");
    }
})

app.get("/book/:id", ensureLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || car.rentedBy) {
            return res.redirect("/cars");
        }
        return res.render("bookingForm.ejs", { car });
    } catch (error) {
        console.error(error);
        return res.redirect("/cars");
    }
})

app.post("/book/:id", ensureLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || car.rentedBy) {
            return res.redirect("/cars");
        }

        car.rentedBy = req.session.user._id;
        car.returnDate = req.body.date;
        await car.save();

        return res.redirect("/cars");
    } catch (error) {
        console.error(error);
        return res.redirect("/cars");
    }
})

app.post("/return/:id", ensureLogin, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car || String(car.rentedBy) !== String(req.session.user._id)) {
            return res.redirect("/cars");
        }

        car.rentedBy = null;
        car.returnDate = "";
        await car.save();

        return res.redirect("/cars");
    } catch (error) {
        console.error(error);
        return res.redirect("/cars");
    }
})

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



async function startServer() {
    try {    
        // TODO: Update this
        await mongoose.connect(process.env.MONGO_CONNECTION_STRING)

        console.log("SUCCESS connecting to MONGO database")

        populateDatabase()

        console.log("STARTING Express web server")        
        
        app.listen(HTTP_PORT, () => {     
            console.log(`server listening on: http://localhost:${HTTP_PORT}`) 
        })    
    }
    catch (err) {        
        console.log("ERROR: connecting to MONGO database")        
        console.log(err)
        console.log("Please resolve these errors and try again.")
    }
}
startServer()



