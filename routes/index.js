var express = require("express");
var router = express.Router();
var strava = require("strava-v3");
var moment = require("moment");
var User = require("../entity/user");
var Token = require("../entity/token");
var csurf = require("csurf");
var csrfProtection = csurf();
var TokenError = require("../error/tokenError").create;

/* GET home page. */
router.get("/", function (req, res, next) {
    res.render("index");
});

router.post("/confirm", csrfProtection, function (req, res, next) {

    // TODO migliorare validazione
    if (!req.body || !req.body.lat || !req.body.lng || !req.body.token) {
        res.send({error: "an exception occurred"});
        return;
    }

    console.log("response: ", req.body);
    var lat = req.body.lat;
    var lng = req.body.lng;
    var retrievedToken;

    Token
        .findOne({uuid: req.body.token})
        .then(token => {
            if (token == null || token.expire < moment.utc().unix()) {
                console.log("Token expired");
                throw TokenError({message: "Invalid token", status: 401});
            }
            retrievedToken = token;
            return User.findOne({slackId: retrievedToken.slackId});
        })
        .then(user => {
            if (user == null) {
                throw new Error("User not found");
            }
            user.location.coordinates = [lat, lng];
            return user.save();
        })
        .then(user => {
            console.log("Location updated for user: ", user);
            retrievedToken.remove();
            res.send({});
        })
        .catch(err => {
            if (err.isTokenError) {
                console.log("TokenError: ", err);
                res.status(err.status);
                res.render("error", {message: err.message, error: {status: err.status, stack: ""}});
            } else {
                console.log("GenericError: ", err);
                res.status(500);
                res.render("error", {message: "Whoops! Something goes wrong", error: {status: 500, stack: ""}});
            }
        });
});

router.get("/confirm", csrfProtection, function (req, res, next) {
    var code = req.query.code;
    var userUuid = req.query.state;

    Token
        .findOne({uuid: userUuid})
        .then(token => {
            if (!token || token.expire < moment.utc().unix()) {
                throw TokenError({message: "Invalid token", status: 401});
            }
            return User.findOne({slackId: token.slackId});
        })
        .then(user => {
            strava.oauth.getToken(code, function (err, payload) {
                if (err) {
                    throw new Error("Error calling Strava API");
                }
                user.stravaAuthToken = payload.access_token;
                return user.save();
            });
        })
        .then(() => {
            res.render("confirm", {uuid: null, csrfToken: req.csrfToken()});
        })
        .catch(err => {
            if (err.isTokenError) {
                console.log("TokenError: ", err);
                res.status(err.status);
                res.render("error", {message: err.message, error: {status: err.status, stack: ""}});
            } else {
                console.log("GenericError: ", err);
                res.status(500);
                res.render("error", {message: "Whoops! Something goes wrong", error: {status: 500, stack: ""}});
            }
        });
});

module.exports = router;
