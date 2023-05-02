module.exports = app => {
  const mangas = require("../controllers/manga.controller.js");
  const rateLimit = require('express-rate-limit');
  var router = require("express").Router();

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 Minute
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: false, // Return rate limit info in the `RateLimit-*` headers
  });

  const actionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 Minute
    max: 10, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: false, // Return rate limit info in the `RateLimit-*` headers
  });

  router.get("/ClassPage", apiLimiter, mangas.findAll);

  router.get("/AllLabel", apiLimiter, mangas.findGenres);

  router.get("/GetClassPageSixComics", apiLimiter, mangas.findSixComics);

  router.get("/ComicDetail", apiLimiter, mangas.findOne);

  router.get("/ArticleDetail", apiLimiter, mangas.findArticle);

  router.get("/GetImageIndex", apiLimiter, mangas.getChapterImages);

  router.get("/Recommend", apiLimiter, mangas.findRecommends);

  router.get("/GetClassPageHomeBanner", apiLimiter, mangas.findBanners);

  router.get("/GetClassPagePosts", apiLimiter, mangas.findPosts);

  router.get("/SearchSug", apiLimiter, mangas.searchMangas);

  router.get("/ListHistory", apiLimiter, mangas.findHistory);

  router.get("/ListStore", apiLimiter, mangas.getStore);

  router.post("/DoBookmark", actionLimiter, mangas.updateBM);

  router.post("/DoHistory", actionLimiter, mangas.updateHistory);

  router.post("/InfiniteMoneyHackIRL", actionLimiter, mangas.checkHcaptcha);

  router.post("/SignUp", actionLimiter, mangas.signUp);

  /*router.get("/IAmAllGrownUp", (req, res) => {
    if (req.cookies.fullAccess == "1") {
      // no: set a new cookie
      res.cookie('fullAccess',0, { maxAge: 900000, httpOnly: true });
    } else {
      res.cookie('fullAccess',1, { maxAge: 900000, httpOnly: true });
    }
    res.json({fullAccess: req.cookies.fullAccess})
  });*/

  app.use('/circinus/Manga.Abyss.v1', router);
};
