import JWT from "jsonwebtoken";

const generateToken = (userId,res) =>{

    const token = JWT.sign({id: userId}, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });

    res.cookie('jwt', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true, // Always true for cross-domain support in modern browsers
        sameSite: 'none' // Required for cross-domain cookies (Vercel -> Render)
    })

    return token;


}
export default generateToken;