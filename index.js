require('dotenv').config();
let express = require("express");
let app = new express();
let jwt = require("jsonwebtoken");
let JWT_SECRET = "hjfbkjdbvkjbvjbv"
let { z } = require("zod");
let bcrypt = require("bcrypt");
const { UserModel, AdminModel, CourseModel } = require("./db");
const rateLimit = require("express-rate-limit");
const cors = require("cors");


app.use(cors());

app.use(express.json());

app.post("/signup", async (req,res) => {
    try{
        const requiredBody = z.object({
            username: z.string().min(5).max(59),
            password: z.string().min(5).max(50),
            email: z.string().min(7).max(50).email()
        })

        const ParsedData = requiredBody.safeParse(req.body);

        if(!ParsedData.success){
            return res.status(400).json({
                message: "invalid input",
                error: ParsedData.error.issues
            })
        }

        const { username, password, email } = ParsedData.data;

        const hashedPassword = await bcrypt.hash(password, 10); // no need of if(!hashedPassword){....} because bcrypt.hash() either returns a hash or throws.

        await UserModel.create({
            username: username, 
            password: hashedPassword,
            email: email
        })

        return res.status(200).json({
            message: "User created"
        });

    }catch(err){
        return res.status(500).json({
            message: "User creation failed"
        })
    }
})

app.post("/login", async (req,res) => {
    try{
        const username = req.body.username;
        const password = req.body.password;

        const user = await UserModel.findOne({
            username: username
        })

        if(!user){
            return res.status(403).json({
                message: "user doesn't exist, bad request"
            })
        }

        const hashedPassword = user.password;

        let verifiedPassword = await bcrypt.compare(password, hashedPassword);

        if(!verifiedPassword){
            return res.status(403).json({
                message: "Invalid password"
            })
        }

        const token = jwt.sign({
            userId: user._id
        }, JWT_SECRET)

        res.status(200).json({
            token: token
        })
    
    } catch(err) {
        res.status(500).json({
            message: "Error occured while signing-in as user"
        })
    }
})

function UserAuth(req, res, next){
    try{
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                message: "token missing"
            });
        }

        const decodedInfo = jwt.verify(token, JWT_SECRET);

        req.userId = decodedInfo.userId;
        next();
        
    } catch(err){
        res.status(403).json({
            message: "User authorization failed, request denied"
        });
    }
}

app.post("/purchase", UserAuth, async (req,res) => {
    try{
        const title = req.body.title;
        
        const course = await CourseModel.findOne({title: title})

        if(!course){
            return res.status(404).json({
                message: "Course not found"
            })
        }

        await UserModel.updateOne(
            {_id : req.userId},
            {
                $addToSet: { courses: course._id }
            }
        )

        return res.status(201).json({
            message: "Course purchased"
        })

    } catch(err) {
        return res.status(500).json({
            message: "Course Purchase failed"
        })
    }

})

app.get("/userCourses", UserAuth, async (req,res) => {
    try{
        const userId = req.userId;

        const user = await UserModel.findById(userId).populate("courses"); // to access all the purchased courses info

        if(!user){
            return res.status(404).json({
                message: "user not found"
            })
        }

        if (user.courses.length === 0){
            return res.status(200).json({ courses: []});
        }

        return res.status(200).json({
            courses: user.courses
        })

    } catch(err) {
        return res.status(500).json({
            message: "Unable to fetch courses"
        })
    }
})

app.post("/adminSignup", async (req,res) => {
    try{
        const requiredBody = z.object({
            AdminUsername: z.string().min(5).max(59),
            AdminPassword: z.string().min(5).max(50),
            AdminEmail: z.string().min(7).max(50).email()
        })

        const ParsedData = requiredBody.safeParse(req.body);

        if(!ParsedData.success){
            return res.status(401).json({
                message: "Invalid input",
                error: ParsedData.error.issues
            })
        }

        const { AdminUsername, AdminPassword, AdminEmail } = ParsedData.data;

        const AdminHashedPassword = await bcrypt.hash(AdminPassword, 10);

        if (!AdminHashedPassword){    
            return res.status(401).json({
                message: "Couldn't hash password"
            })
        }

        await AdminModel.create({
            AdminUsername: AdminUsername, 
            AdminPassword: AdminHashedPassword,
            AdminEmail: AdminEmail
        })

        return res.status(200).json({
            message: "Admin created"
        });

    }catch(err){
        return res.status(500).json({
            message: "Admin creation failed"
        })
    }
})

app.post("/adminLogin", async (req,res) => {
    try{
        const AdminUsername = req.body.AdminUsername;
        const AdminPassword = req.body.AdminPassword;

        const admin = await AdminModel.findOne({
            AdminUsername: AdminUsername
        })

        if(!admin){
            return res.status(403).json({
                message: "Admin doesn't exist, bad request"
            })
        }

        const AdminHashedPassword = admin.AdminPassword;

        let verifiedPassword = await bcrypt.compare(AdminPassword, AdminHashedPassword);

        if(!verifiedPassword){
            return res.status(403).json({
                message: "Invalid password"
            })
        }

        const token = jwt.sign({
            AdminId: admin._id
        }, JWT_SECRET)

        return res.status(200).json({
            token: token
        })
    
    } catch(err) {
        return res.status(500).json({
            message: "Error occured while signing-in as admin"
        })
    }
})

function AdminAuth(req, res, next){
    try{    
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                message: "token missing"
            });
        }

        const decodedInfo = jwt.verify(token, JWT_SECRET);

        req.AdminId = decodedInfo.AdminId;
        next();

    } catch(err){
        return res.status(403).json({
            message: "Admin authorization failed, request denied"
        });
    }
}

app.post("/createCourse", AdminAuth, async (req,res) => {
    try{
        const title = req.body.title;
        const price = req.body.price;

        await CourseModel.create({
            title: title,
            price: price
        })

        return res.status(200).json({
            message: "Course created successfully"
        })

    } catch(err) {
        return res.status(500).json({
            message: "Course creation failed"
        })
    }
    
})

app.delete("/deleteCourse", AdminAuth, async (req,res) => {
    try{
        const title = req.body.title;

         const course = await CourseModel.findOne({ title: title });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        await CourseModel.deleteOne({
            title: title,
        })

        await UserModel.updateMany(
            {},  // empty filter means "match all users"
            { $pull: { courses: course._id } }
        );

        return res.status(200).json({
            message: "Course delete successfully"
        })
        
    } catch(err) {
        return res.status(500).json({
            message: "Course deletion failed"
        })
    }
})

const coursesLimiter = rateLimit({ //rateLimit is already a middleware, so no need to wrap it in a middleware function
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP per window
    message: "Too many requests, please try again later"
});


app.get("/courses", coursesLimiter, async (req,res) => {
    try{
        const courses = await CourseModel.find();

        if(courses.length === 0){
            return res.status(200).json({ courses: []});
        }

        return res.status(200).json({
            courses: courses
        })

    } catch(err) {
        return res.status(500).json({
            message: "Couldn't fetch courses"
        })
    }
})

app.listen(3000);