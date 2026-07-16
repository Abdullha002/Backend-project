import express from "express";
import cookieParser from "cookie-parser"; // need to install
import cors from "cors";  // need to install


const app = express();

// Configurations

app.use(cors({
    orgin: process.env.CORS_ORIGIN,
    Credential: true
}))
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import
import userRouter from "./routes/user.routes.js";


// rourtes declaration
app.use("/api/v1/users", userRouter);

export default app;