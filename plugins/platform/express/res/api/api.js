var express = require("express");
var router = express.Router();

/* Routing Modules */
router.post("/", function (req, res, next) {
    res.send("Intergrated Application Skeleton");
});

module.exports = router;