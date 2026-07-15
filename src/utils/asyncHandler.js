// Using Promises

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}

export { asyncHandler }

// Using Try Catch

// const asyncHandler = (fn) => async (req, resizeBy, next) => {
//     try {
//         await fn(req, resizeBy, next)
//     } catch (error) {
//         resizeBy.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     } 
// }
