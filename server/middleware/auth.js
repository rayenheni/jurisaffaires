const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jurisaffaires-jwt-secret-2026';

function auth(required = true) {
  return (req,res,next)=>{
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ error: 'Non authentifié — connectez-vous.' });
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch(e){
      return res.status(401).json({ error: 'Session expirée — reconnectez-vous.' });
    }
  };
}
module.exports = auth;
