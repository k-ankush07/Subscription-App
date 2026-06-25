 const ProtectMiddleware = (req, res, next) => {
  const secretKey = process.env.API_SECRET_KEY;
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== secretKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
};

export {ProtectMiddleware}


