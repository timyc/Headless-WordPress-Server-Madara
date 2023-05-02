const express = require("express");
const cors = require("cors");
var cookieParser = require('cookie-parser');

const app = express();

if (process.argv[2] && process.argv[2] === '--local') {
  var corsOptions = {
    origin: "http://localhost:3000",
    credentials: true
  };
} else {
  var corsOptions = {
    origin: ["..."], // FILL WITH YOUR OWN DOMAIN(S)
    credentials: true
  };
}

app.use(cors(corsOptions));

app.use(cookieParser());

app.use(function (req, res, next) {
  // check if client sent cookie
  var cookie = req.cookies.fullAccess;
  if (cookie === undefined) {
    // no: set a new cookie
    res.cookie('fullAccess',0, { maxAge: 900000, httpOnly: true });
  }
  next(); // <-- important!
});

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

require("./app/routes/manga.routes.js")(app);

app.use((req, res, next) => {
    res.status(404).json({ code: "bad_route", msg: "unsupported method \"GET\" (only POST is allowed)"})
});
// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
