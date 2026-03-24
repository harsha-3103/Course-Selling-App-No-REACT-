const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

console.log("MONGO_URL exists:", !!process.env.MONGO_URL);
console.log("Running db from:", __dirname);

const rawUrl = process.env.MONGO_URL || "";
const safeUrl = rawUrl.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
console.log("MONGO_URL seen by Node:", safeUrl);

const connection = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB connected");
    } catch(err) {
        console.error("MongoDB connection failed", err);
        process.exit(1);
    }
}

connection();

const User = new Schema({
    username : {type: String, unique: true},
    password : String,
    email : {type: String, unique: true},
    courses: [{ // since we don't initialize this property while user/signup, mongoose initializes it as an empty array since we defined it to be an array
        type: ObjectId,
        ref: "courses" //because we defined the courses collection as 'courses'
    }]
})

const Admin = new Schema({
    AdminUsername : {type: String, unique: true},
    AdminPassword : String,
    AdminEmail : {type: String, unique: true} 
})

const Course = new Schema({
    title: {type: String, unique: true},
    price: Number
})

const UserModel = mongoose.model("users", User);
const AdminModel = mongoose.model("admins", Admin);
const CourseModel = mongoose.model("courses", Course);

module.exports = {
    UserModel: UserModel,
    AdminModel: AdminModel,
    CourseModel: CourseModel
}
