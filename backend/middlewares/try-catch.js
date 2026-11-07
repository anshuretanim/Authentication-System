const tryCatch = (handler) => { //handler is another function we're passing intro try-catch.
    return async(req,res,next) => { //tryCatch returns a function. The returned function accepts 3 arguments.
        try{
            await handler(req,res,next);
        }catch(err){
            res.status(500).json({
                message: err.message
            });
        }
    };
};

export default tryCatch;
