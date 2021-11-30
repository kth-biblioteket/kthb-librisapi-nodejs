const jwt = require("jsonwebtoken");
function verifyToken(req, res, next) {
    let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.headers['authorization']; 
    // Express headers are auto converted to lowercase
    if (!token)
        return res.status(403).send({ auth: false, message: 'No token provided.' });
    
    if(req.headers['x-access-token']) {
        //JWT
        jwt.verify(token, process.env.SECRET, function(err, decoded) {
            if (err)
                return res.status(401).send({ auth: false, message: 'Failed to authenticate token, ' + err.message });
            req.userprincipalname = decoded.id;
            //Skapa ny token för varje validerad request
            req.token = jwt.sign({ id: req.userprincipalname }, process.env.SECRET, {
                expiresIn: "7d"
            });
            next();
        });
    } else if(req.headers['authorization']) {
        
        //Alma Cloud App JWT
        //const publicKey = require('fs').readFileSync(__dirname + '/public-key.pem');
        const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo0h874QlymQoEhLZM5KS
gjnyzUJYASvpHgDDw7GB5XsX+xWJINDMjLetyMahb3b9df2TSqnVD3A+pAGu/Ubu
HeAXaKBMSTz+Z3okfzsHnPbV33fy5bHfEkDbn9IiuKiBUY9Y8kVy2mU8WNEq83ZB
7lb3vcIqtNJf9Xl/h5P6Vyr0817mVwr5dVJgihCmau86NrD+Q5ytC2EGHobiJE2r
mHH/ufR0ypZvRA3oXIMAZOjOyJnbbIr18Cazip+gda4LGXzGXQn89Ts3SxhGScHT
QMvPRMO6xf4W1+wn8kG/ejLif+acanJeRoDdYkNfw4p9AL1MB/9trvalg+KfX2Mp
1wIDAQAB
-----END PUBLIC KEY-----`
        try {
            token = token.slice(7, token.length);
            const verified = jwt.verify(token, publicKey, {algorithm: 'RS256'});
            next();
        } catch (e) {
            return res.status(401).send({ auth: false, message: 'Failed to authenticate token, ' + e.message });
        } 
          
    } else {
        //APIKEY
        if(token != process.env.APIKEY){
            return res.json({ success: false, message: 'Failed to authenticate token.' });
        } else {
            next();
        }
    }
}

module.exports = verifyToken;