import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError("Something went wrong while generating access and refresh tokens", 500);
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // 1) get user details from frontend
    const { fullName, email, username, password } = req.body;
    // console.log("email: ", email);

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
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError("User with email or username already exists", 409);
    }

    // 4) check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400);
    }

    // 5) upload them to cloudinary, avatar
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

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

const loginUser = asyncHandler(async (req, res) => {
    // 1) get the data from frontend
    const { username, email, password } = req.body;

    // 2) validate the data
    if (!username && !email) {
        throw new ApiError("Username or email is required", 400);
    }

    // 3) find the user in db
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError("User does not exist", 404);
    }

    // 4)check for password
    const isPasswordValid= await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError("Invalid credentials", 401);
    }

    // 5) generate access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // 6) send cookie with refresh token and send access token in response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    // 1) get the user id from req.user
    const userId = req.user._id;

    // 2) find the user in db
    const user = await User.findById(userId);

    // const user = await User.findByIdAndUpdate(userId, 
    //     { $set: { refreshToken: undefined } }, 
    //     { new: true }
    // );

    // OR the down side code is also correct but the above code is more efficient as it updates the user in one go instead of two queries

    // 3) update the user's refresh token to null
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // 4) clear the cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };