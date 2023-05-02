const Manga = require("../models/manga.model.js");
const {verify} = require('hcaptcha');
const axios = require("axios");
const adminConfig = require("../config/admin.config.js");
let secret = "";
if (process.argv[2] && process.argv[2] === '--local') {
  secret = '0x0000000000000000000000000000000000000000';
} else {
  secret = '...'; // FILL WITH YOUR OWN hCAPTCHA SECRET!!!
}

exports.findSixComics = (req, res) => {
  let pageNum = Math.abs(parseInt(req.query.page)) || 1;
  let pid = Math.abs(parseInt(req.query.id)) || 0;
let isAdult = Math.abs(parseInt(req.query.fullAccess)) || 0;
  let rand = parseInt(req.query.rand) || 0;

  if (rand != 0) {
    rand = 1;
  }

  pageNum = (pageNum - 1) * 6;

  if (pageNum > 999) {
    pageNum = 1;
  }

  Manga.getSixComics(pid, pageNum, isAdult, rand, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving webtoons."
      });
    else res.send(data);
  });
};

exports.findRecommends = (req, res) => {
  let isAdult = req.cookies.fullAccess == "1" ? 1 : 0;

  Manga.RandomRecommend(isAdult, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving webtoons."
      });
    else res.send(data);
  });
};

// Retrieve all Mangas
exports.findAll = (req, res) => {
  let pageNum = Math.abs(parseInt(req.query.page_num)) || 1;
  let pageSize = Math.abs(parseInt(req.query.page_size)) || 18;
  let isAdult = Math.abs(parseInt(req.query.fullAccess)) || 0;
  let genre = Math.abs(parseInt(req.query.styles)) || 0;
  if (pageNum > 999) {
    pageNum = 1;
  }
  if (pageSize > 50) {
    pageSize = 18;
  }

  pageNum = (pageNum - 1) * pageSize;

  Manga.getAll(pageNum, pageSize, isAdult, genre, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving webtoons."
      });
    else res.send(data);
  });
};

exports.findOne = (req, res) => {
  Manga.getOne(req.query.slug, (err, data) => {
    if (err) {
      res.status(500).send({
          message: "Error retrieving Manga with id " + req.query.slug
        });
    } else if (data.data === undefined){
      res.status(400).send({"code":"invalid_argument","msg":"invalid webtoon!? naver strikes again!"})
    } else {
      res.send(data);
    }
  });
};

exports.findArticle = (req, res) => {
  Manga.getArticle(req.query.slug, (err, data) => {
    if (err) {
      res.status(500).send({
          message: "Error retrieving Article with id " + req.query.slug
        });
    } else if (data.data === undefined){
      res.status(400).send({"code":"invalid_argument","msg":"invalid webtoon!? naver strikes again!"})
    } else {
      res.send(data);
    }
  });
};

// find all Genres
exports.findGenres = (req, res) => {
  let limit = Math.abs(parseInt(req.query.limit)) || 10;
  if (limit > 200) {
    limit = 10;
  }
  Manga.getGenres(limit, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving genres."
      });
    else res.send(data);
  });
};


exports.searchMangas = (req, res) => {
  let query = req.query.query;
  let limit = Math.abs(parseInt(req.query.limit)) || 5;
  if (limit > 10) {
    limit = 10;
  }
  if (query.length < 1) {
    res.status(400).send({"code":"shit_query","msg":"Query needs to be longer or equal to 1 characters!"});
  }
  Manga.getSearch(query, limit, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving genres."
      });
    else res.send(data);
  });
};

exports.getChapterImages = (req, res) => {
  Manga.findChapterImages(req.query.chapter_id, req.query.slug, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving genres."
      });
    else res.send(data);
  });
};


exports.findBanners = (req, res) => {
  let limit = Math.abs(parseInt(req.query.limit)) || 5;
  if (limit > 200) {
    limit = 5;
  }
  Manga.getBanners(limit, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving banners."
      });
    else res.send(data);
  });
};

exports.findPosts = (req, res) => {
  let limit = Math.abs(parseInt(req.query.limit)) || 2;
  if (limit > 100) {
    limit = 2;
  }
  Manga.getPosts(limit, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving posts."
      });
    else res.send(data);
  });
};

exports.updateBM = (req, res) => {
  let token = req.body.token || "";
  let bookmark = req.body.bookmark || 0;
  let toon = req.body.toon || 0;
  Manga.doBookmark(token, bookmark, toon, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving bookmarks."
      });
    else res.send(data);
  });
};

exports.updateHistory = (req, res) => {
  let token = req.body.token || "";
  let history = req.body.history || 0;
  let toon = req.body.toon || 0;
  Manga.doHistory(token, history, toon, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving history."
      });
    else res.send(data);
  });
};

exports.getStore = (req, res) => {
  let cat = Math.abs(parseInt(req.query.category)) || 1;
  Manga.fetchStore(cat, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving store items."
      });
    else res.send(data);
  });
};

exports.signUp = (req, res) => {
  let n = req.body.username || '';
  let e = req.body.email || '';
  let p = req.body.password || '';
  let t = req.body.token || '';
  let hasError = false;
  let eMsg = '';
  try {
    verify(secret, t)
    .then((data) => {
      if (data.success === true) {
        const admin = axios.create({
          baseURL: `${adminConfig.WORDPRESS_URL}/wp-json/jwt-auth/v1/`,
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });
        let token = '';
        admin.post("token", { username: adminConfig.USER, password: adminConfig.PASSWORD })
        .then((r) => {
          token = r.data.token;
        })
        .catch((e) => {
          if (e) {
            hasError = true;
          }
          eMsg = e.message || "Some error occurred.";
        })
        .finally(() => {
          if (!hasError) {
            const webreg = axios.create({
              baseURL: `${adminConfig.WORDPRESS_URL}/wp-json/wp/v2/users/`,
              withCredentials: true,
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
              },
              timeout: 10000,
            });
            let hasError2 = false;
            let eMsg2 = '';
            webreg.post('', {username: n, email: e, password: p})
            .catch((e) => {
              if (e) {
                hasError2 = true;
              }
              eMsg2 = e.message || "Some error occurred.";
            })
            .finally(() => {
              if (!hasError2) {
                res.send({code: 200, msg: "Successfully Signed Up! You can log in now."});
              } else {
                res.status(500).send({code: 0, msg: "Username or Email already taken"});
              }
              
            });
          } else {
            res.status(500).send({code: 0, msg: "Server error: misconfigured account."});
          }
          
        });
        } else {
           res.status(500).send({code: 0, msg: "ERROR"});
        }
      });
    } catch(e) {
      res.status(500).send({code: 0, msg: "CAPTCHA Error"});
    }
  
};

exports.checkHcaptcha = (req, res) => {
  let token = req.body.token || "";
  let token2 = req.body.token2 || "";
  try {
    verify(secret, token2)
    .then((data) => {
      if (data.success === true) {
        Manga.giveCoins(token, (err, data) => {
          if (err)
            res.status(500).send({code: 0, msg: "ERROR"});
          else res.send(data);
        });
      } else {
         res.status(500).send({code: 0, msg: "ERROR"});
      }
    });
  } catch(e) {
    res.status(500).send({code: 0, msg: "ERROR"});
  }
  
};


exports.findHistory = (req, res) => {
  let history = [1];
  try {
    history = JSON.parse(req.query.history) || [1];
  }
  catch(e) {
    history = [1];
  }
  if (history.length > 100) {
    history = [1];
  }
  if (history.length == 0) {
    return res.send({code: 0, msg: "", data: {list: []}});
  }
  Manga.getHistoryItems(history, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving banners."
      });
    else res.send(data);
  });
};
