import {v2 as clodinary} from "cloudinary"
import fs from "fs"

clodinary.config({
    cloud_name: process.env.CLODINARY_CLOD_NAME,
    api_key: process.env.CLODINARY_API_KEY,
    api_secret: process.env.CLODINARY_API_SECRET
});

const uploadOnClodinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on clodinary
        const response = await clodinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded uccessfully
        console.log("file is uploaded on cloudinary", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // removes the locally saved temporary file as the upload operation got failed
    }
}


export {uploadOnClodinary}
