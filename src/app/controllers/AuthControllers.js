const db = require('../../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthControlllers {
    // xác thực người dùng
    verifyToken(req, res, next) {
        const authorizationClient = req.headers['authorization'];
        const token = authorizationClient && authorizationClient.split(' ')[1];

        if (!token) {
            //nếu không có token trả về 401
            return res.status(401);
        }

        jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
            if (err) return res.status(403);
            req.decoded = decoded.data[0];
            // console.log(req.decoded);
            next();
        });
    }

    //[POST] /auth/login
    login(req, res, next) {
        var { username, password } = req.body;
        let query;

        // Creating Query
        query =
            "SELECT users.* FROM accounts,users WHERE username LIKE  '" +
            username +
            "' AND password LIKE '" +
            password +
            "' AND accounts.id_user = users.id_user";

        //response
        db.query(query, function (err, result) {
            if (err) return res.status(400);

            const token = jwt.sign({ data: result }, process.env.SECRET_KEY, {
                expiresIn: '1d',
            });

            let decodedCode;
            jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
                if (err) return res.status(403);
                decodedCode = decoded;
            });

            if (result.length === 0)
                res.status(200).json({ message: 'Tài khoản không tồn tại', token: null });
            else {
                res.status(200).json({
                    message: 'Đăng nhập thành công',
                    token: token,
                    exp: decodedCode.exp,
                    id_user: decodedCode.data[0].id_user,
                });
            }
        });
    }

    //[POST] /auth/register
    register(req, res, next) {
        var { username, password } = req.body;
        let queryCheck, queryCreateUser, queryCreateAccount;
        let id_user = Math.random().toString(20);

        // Creating Query
        queryCheck = "SELECT * FROM accounts WHERE username LIKE  '" + username + "'";
        queryCreateUser =
            "INSERT INTO users (id_user, nickname, full_name) VALUES ('" +
            id_user +
            "', '" +
            id_user +
            "', '" +
            id_user +
            "') ";
        queryCreateAccount =
            "INSERT INTO accounts (id_user, username, password) VALUES ('" +
            id_user +
            "', '" +
            username +
            "', '" +
            password +
            "')";

        //response
        db.query(queryCheck, function (err, result) {
            if (err) return res.status(400);
            if (result.length !== 0)
                res.status(200).json({
                    message: 'Tài khoản đã tồn tại. Vui lòng nhập tài khoản khác',
                    data: null,
                });
            else {
                db.query(queryCreateUser, function (err, result) {
                    if (err) return res.status(400);
                });
                db.query(queryCreateAccount, function (err, result) {
                    if (err) return res.status(400);
                });
                res.status(200).json({
                    message: 'Tài khoản đã tạo thành công',
                    data: {},
                });
            }
        });
    }
}

module.exports = new AuthControlllers();
