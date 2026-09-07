import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
   const token=req.cookies.token;
  
    console.log("🍪 Cookie token:", token ? "TOKEN FOUND" : "TOKEN NOT FOUND");
   //const token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOjEsInVzZXJuYW1lIjoiUGFkbWFrYXIgTmFyd2FkZSIsInJvbGVpZCI6bnVsbCwiaWF0IjoxNzY4NTc3NDI1LCJleHAiOjE3Njg1ODEwMjV9.OsDGVz1AObwC9OIMvIcLmK93qIRW22w98n1nBVaWTOY';
   if (!token) {
    return res.status(401).json({ message: 'No token provided' });
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded;
        next();
    }catch(err){
        return res.status(401).json({message:'Error Found Invalid token or Expired '+res.statusCode});
    }
};

export default verifyToken;