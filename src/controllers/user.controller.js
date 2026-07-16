import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    // 1) get user details from frontend
    const { fullName, email, username, password } = req.body;
    console.log("email: ", email);

    // 2) validate user details - not empty

    // WE CAN VALIDATE LIKE THIS MANUALLY FOR ALL FIELDS
    // if (fullName === ""){
    //     throw new ApiError("Full name is required", 400);
    // } OR

    if (
        [fullName, email, username, password].some((field) => 
            field?.trim() === "")
    ) {
        throw new ApiError("All fields are required", 400);
    }

    // 3) check if user already exists - username, email
    const existedUser = User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError("User with email or username already exists", 409);
    }

    // 4) check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400);
    }

    // 5) upload them to cloudinary, avatar
    const avatarResponse = await uploadOnClodinary(avatarLocalPath);
    const coverImageResponse = await uploadOnClodinary(coverImageLocalPath);

    if (!avatarResponse) {
        throw new ApiError("Avatar upload failed", 500);
    }


    // 6) create user object - create entry in db
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatarResponse.url,
        coverImage: coverImageResponse?.url || ""
    });

    // 7) check for user creation and remove password and refresh token field from response
    const createdUser = await User.findById(user._id)
    .select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError("User creation failed", 500);
    }

    // 8) return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully"));

});

export { registerUser };