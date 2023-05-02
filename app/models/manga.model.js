const sql = require("./db.js");
const parallel = require("async/parallel");
const axios = require("axios");
const serialize = require("../helpers/serialize.js");
const adminConfig = require("../config/admin.config.js");

// constructor
const Manga = function(manga) {
  this.title = manga.title;
  this.description = manga.description;
  this.published = manga.published;
};

Manga.getOne = (slug = 'solo-leveling', result) => {
  let query = `
  SELECT p.id AS comic_id, p.post_content AS description, pm2.meta_value AS thumb, p.post_title AS title, p.post_name AS url, DATE_FORMAT(p.post_modified,'%d/%m/%Y') AS lupdated
  FROM 
    wp_posts AS p
    INNER JOIN wp_postmeta AS pm1 ON p.id = pm1.post_id
    INNER JOIN wp_postmeta AS pm2 ON pm1.meta_value = pm2.post_id
  WHERE 
    pm2.meta_key = '_wp_attached_file'
    AND pm1.meta_key = '_thumbnail_id'
    AND p.post_type = 'wp-manga'
    AND p.post_status = 'publish'
    AND p.post_name = ?
  ORDER BY p.post_modified DESC LIMIT 1`;

  sql.query(query, slug, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    if (res.length > 0) {
      parallel([
        function(callback) {
          let query = `
          SELECT tags.name
          FROM
            wp_terms AS tags
            INNER JOIN wp_term_taxonomy tags_tax ON (tags_tax.term_id = tags.term_id)
            INNER JOIN wp_term_relationships tags_rel ON (tags_tax.term_taxonomy_id = tags_rel.term_taxonomy_id)
            INNER JOIN wp_posts posts ON (tags_rel.object_id = posts.ID)
          WHERE
            tags_tax.taxonomy = 'wp-manga-genre'
            AND posts.post_type = 'wp-manga'
            AND posts.post_status = 'publish'
            AND posts.ID = ?
          GROUP BY tags_tax.term_id;`;
          sql.query(query, res[0].comic_id, (err, resex) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            res[0].genres = resex;
            callback(null);
          });
        },
        function(callback) {
          let query = `
          SELECT tags.name
          FROM
            wp_terms AS tags
            INNER JOIN wp_term_taxonomy tags_tax ON (tags_tax.term_id = tags.term_id)
            INNER JOIN wp_term_relationships tags_rel ON (tags_tax.term_taxonomy_id = tags_rel.term_taxonomy_id)
            INNER JOIN wp_posts posts ON (tags_rel.object_id = posts.ID)
          WHERE
            tags_tax.taxonomy = 'wp-manga-author'
            AND posts.post_type = 'wp-manga'
            AND posts.post_status = 'publish'
            AND posts.ID = ?
          GROUP BY tags_tax.term_id;`;
          sql.query(query, res[0].comic_id, (err, resex) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            res[0].authors = resex;
            callback(null);
          });
        },
        function(callback) {
          let query = `
          SELECT pm.meta_value
          FROM
            wp_postmeta AS pm
            INNER JOIN wp_posts posts ON (pm.post_id = posts.ID)
          WHERE
            pm.meta_key = '_wp_manga_type'
            AND posts.post_type = 'wp-manga'
            AND posts.post_status = 'publish'
            AND posts.ID = ?`;
          sql.query(query, res[0].comic_id, (err, resex) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            if (resex.length > 0) {
              res[0].style = resex[0].meta_value;
            }
            callback(null);
          });
        },
        function(callback) {
          let query = `
          SELECT chapter_id, chapter_name, chapter_slug, DATE_FORMAT(date,'%M %d at %H:%i') AS lupdated
          FROM
            wp_manga_chapters
          WHERE
            post_id = ?
          ORDER BY wp_manga_chapters.date DESC`;
          sql.query(query, res[0].comic_id, (err, resex) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            if (resex.length > 0) {
              res[0].chapters = resex;
            }
            callback(null);
          });
        }
      ],function(err) {
          result(null, {code: 0, msg: "", data: res[0]});
      });
    } else {
      result(null, {});
    }
    
    //result(null, {code: 0, msg: "", data: res[0]});
  });
};

Manga.getArticle = (slug = 'solo-leveling', result) => {
  let query = `
  SELECT p.id AS comic_id, p.post_content AS description, p.post_title AS title, p.post_name AS url, DATE_FORMAT(p.post_modified,'%d/%m/%Y') AS lupdated
  FROM 
    wp_posts AS p
  WHERE 
    p.post_type = 'post'
    AND p.post_status = 'publish'
    AND p.post_name = ?
  ORDER BY p.post_modified DESC LIMIT 1`;

  sql.query(query, slug, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: res[0]});
  });
};

function findMeta(id = 1, result) {
  let query = `
  SELECT tags.name
  FROM
    wp_terms AS tags
    INNER JOIN wp_term_taxonomy tags_tax ON (tags_tax.term_id = tags.term_id)
    INNER JOIN wp_term_relationships tags_rel ON (tags_tax.term_taxonomy_id = tags_rel.term_taxonomy_id)
    INNER JOIN wp_posts posts ON (tags_rel.object_id = posts.ID)
  WHERE
    tags_tax.taxonomy = 'wp-manga-genre'
    AND posts.post_type = 'wp-manga'
    AND posts.post_status = 'publish'
    AND posts.ID = ${id}
  GROUP BY tags_tax.term_id;`;

  sql.query(query, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: res[0]});
  });
}

Manga.getSixComics = (pid = 0, pageNum = 1, isAdult = 0, rand = 0, result) => {
  let adultCheck = {0: ['INNER JOIN wp_postmeta AS pm3 ON p.id = pm3.post_id', `AND pm3.meta_key = 'manga_adult_content' AND pm3.meta_value != 'a:1:{i:0;s:3:"yes";}'`], 1: ['', '']}
  let randoms = [`p.post_modified DESC LIMIT 6 OFFSET ${pageNum}`, 'RAND() LIMIT 6'];
  let genreCheck
  if (pid != 0) {
    genreCheck = ['INNER JOIN wp_term_relationships AS wtr ON wtr.object_id = p.id', `AND wtr.term_taxonomy_id = '${pid}'`]
  } else {
    genreCheck = ['', '']
  }
  let query = `
  SELECT p.id AS comic_id, pm2.meta_value AS thumb, p.post_title AS title, p.post_name AS url, DATE_FORMAT(p.post_modified,'%M %d at %H:%i') AS lupdated
  FROM 
    wp_posts AS p
    INNER JOIN wp_postmeta AS pm1 ON p.id = pm1.post_id
    INNER JOIN wp_postmeta AS pm2 ON pm1.meta_value = pm2.post_id
    ${genreCheck[0]}
    ${adultCheck[isAdult][0]}
  WHERE 
    pm2.meta_key = '_wp_attached_file'
    AND pm1.meta_key = '_thumbnail_id'
    ${genreCheck[1]}
    ${adultCheck[isAdult][1]}
    AND p.post_type = 'wp-manga'
    AND p.post_status = 'publish'
  ORDER BY ${randoms[rand]}`;

  sql.query(query, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {webtoons: res}});
  });
};

Manga.RandomRecommend = (isAdult = 0, result) => {
  let adultCheck = {0: ['INNER JOIN wp_postmeta AS pm3 ON p.id = pm3.post_id', `AND pm3.meta_key = 'manga_adult_content' AND pm3.meta_value != 'a:1:{i:0;s:3:"yes";}'`], 1: ['', '']}
  let query = `
  SELECT p.id AS comic_id, pm2.meta_value AS thumb, p.post_title AS title, p.post_name AS url, DATE_FORMAT(p.post_modified,'%d/%m/%Y') AS lupdated
  FROM 
    wp_posts AS p
    INNER JOIN wp_postmeta AS pm1 ON p.id = pm1.post_id
    INNER JOIN wp_postmeta AS pm2 ON pm1.meta_value = pm2.post_id
    ${adultCheck[isAdult][0]}
  WHERE 
    pm2.meta_key = '_wp_attached_file'
    AND pm1.meta_key = '_thumbnail_id'
    ${adultCheck[isAdult][1]}
    AND p.post_type = 'wp-manga'
    AND p.post_status = 'publish'
  ORDER BY RAND() DESC LIMIT 6`;

  sql.query(query, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {webtoons: res}});
  });
};

Manga.getAll = (pageNum = 1, pageSize = 18, isAdult = 0, genre = 0, result) => {
  let adultCheck = {0: ['INNER JOIN wp_postmeta AS pm3 ON p.id = pm3.post_id', `AND pm3.meta_key = 'manga_adult_content' AND pm3.meta_value != 'a:1:{i:0;s:3:"yes";}'`], 1: ['', '']}
  let genreCheck;
  if (genre != 0) {
    genreCheck = ['INNER JOIN wp_term_relationships AS wtr ON wtr.object_id = p.id', `AND wtr.term_taxonomy_id = '${genre}'`]
  } else {
    genreCheck = ['', '']
  }
  let query = `
  SELECT p.id AS comic_id, pm2.meta_value AS thumb, p.post_title AS title, p.post_name AS url, DATE_FORMAT(p.post_modified,'%d/%m/%Y') AS lupdated
  FROM 
    wp_posts AS p
    INNER JOIN wp_postmeta AS pm1 ON p.id = pm1.post_id
    INNER JOIN wp_postmeta AS pm2 ON pm1.meta_value = pm2.post_id
    ${genreCheck[0]}
    ${adultCheck[isAdult][0]}
  WHERE 
    pm2.meta_key = '_wp_attached_file'
    AND pm1.meta_key = '_thumbnail_id'
    ${genreCheck[1]}
    ${adultCheck[isAdult][1]}
    AND p.post_type = 'wp-manga'
    AND p.post_status = 'publish'
  ORDER BY p.post_modified DESC LIMIT ${pageSize} OFFSET ${pageNum}`;

  sql.query(query, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {webtoons: res}});
  });
};

Manga.getGenres = (limit = 10, result) => {
  sql.query(`SELECT DISTINCT wp_terms.term_id, name, slug FROM wp_terms INNER JOIN wp_term_taxonomy ON wp_terms.term_id = wp_term_taxonomy.term_id WHERE wp_term_taxonomy.taxonomy = 'wp-manga-genre' LIMIT ${limit}`, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {genres: res}});
  });
};

Manga.getSearch = (query = "poop", limit = 5, result) => {
  let theQuery = `
  SELECT pm2.meta_value AS thumb, post_title AS title, post_name AS url
  FROM 
    wp_posts AS p
    INNER JOIN wp_postmeta AS pm1 ON p.id = pm1.post_id
    INNER JOIN wp_postmeta AS pm2 ON pm1.meta_value = pm2.post_id
  WHERE 
    pm2.meta_key = '_wp_attached_file'
    AND pm1.meta_key = '_thumbnail_id'
    AND p.post_type = 'wp-manga'
    AND p.post_status = 'publish'
    AND (post_title LIKE ? OR wp_manga_search_text LIKE ?) LIMIT ${limit}`;
  sql.query(theQuery, ['%' + query + '%', '%' + query + '%'], (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: res});
  });
};

Manga.getBanners = (limit = 5, result) => {
  sql.query(`SELECT * FROM ma_banners LIMIT ${limit}`, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {banners: res}});
  });
};

Manga.getPosts = (limit = 5, result) => {
  sql.query(`
  SELECT wp_posts.post_title, wp_posts.post_content, wp_posts.post_name,
    (
        SELECT guid
        FROM   wp_posts
        WHERE  id = wp_postmeta.meta_value
    ) AS image 
  FROM
    wp_users
    INNER JOIN wp_posts ON wp_users.ID = wp_posts.post_author AND wp_posts.post_type = 'post'
    INNER JOIN wp_postmeta ON wp_postmeta.post_id = wp_posts.id AND wp_postmeta.meta_key = '_thumbnail_id'
  ORDER BY wp_posts.post_modified DESC LIMIT ${limit}`, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {posts: res}});
  });
};

Manga.findChapterImages = (id = "chapter-1", slug = "solo-leveling", result) => {
  let query = `
  SELECT
    wp_posts.id AS comic_id, wp_posts.post_title AS title, wp_posts.post_name AS slug, wp_manga_chapters.chapter_name AS ch_name, wp_manga_chapters.chapter_id AS ch_id, wp_manga_chapters_data.data
  FROM 
    wp_posts
    INNER JOIN wp_manga_chapters ON wp_posts.id = wp_manga_chapters.post_id
    INNER JOIN wp_manga_chapters_data ON wp_manga_chapters.chapter_id = wp_manga_chapters_data.chapter_id
  WHERE
    wp_posts.post_name = ?
    AND wp_manga_chapters.chapter_slug = ?`;
  sql.query(query, [slug, id], (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    if (res.length > 0) {
      sql.query(`SELECT chapter_id, chapter_name, chapter_slug, date FROM wp_manga_chapters WHERE post_id = ? ORDER BY date DESC`, res[0].comic_id, (err, res2) => {
        if (err) {
          console.log("error: ", err);
          result(null, {code: 0, msg: "ERROR"});
          return;
        }
        result(null, {code: 0, msg: "", data: {idata: res[0], chdata: res2}});
      });
    } else {
      result(null, {code: 0, msg: "ERROR"});
    }
  });
};

Manga.getHistoryItems = (history = [], result) => {
  sql.query(`
    SELECT 
      wp_posts.post_title, wp_manga_chapters.chapter_name, wp_posts.post_name, wp_manga_chapters.chapter_slug 
    FROM 
      wp_posts 
      INNER JOIN wp_manga_chapters ON wp_posts.ID = wp_manga_chapters.post_id 
    WHERE 
      wp_manga_chapters.chapter_id IN (${sql.escape(history)})`, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {list: res}});
  });
};

Manga.fetchStore = (category = 0, result) => {
  sql.query(`
    SELECT 
      ma_prizes.id, ma_prizes.name, ma_prizes.description, ma_prizes.cost, ma_prizes.image, ma_prizes.stock
    FROM 
      ma_prizes INNER JOIN ma_games ON ma_prizes.game = ma_games.id
    WHERE 
      ma_prizes.game = ?`, category, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(null, {code: 0, msg: "ERROR"});
      return;
    }
    result(null, {code: 0, msg: "", data: {items: res}});
  });
};

Manga.doBookmark = (token = "", bookmark = 1, toon = 1, result) => {
  const maxBookmarks = 30;
  let bookmarks = [];
  let user = 0;
  let isError = 0;
  let bookmarkType = 0; // 0 = Delete, 1 = Add
  let cFlag = false; // creation flag
  const api = axios.create({
    baseURL: `${adminConfig.WORDPRESS_URL}/wp-json/wp/v2/users/`,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    timeout: 10000,
  });
  api.get("me")
  .then((response) => {
    if (response.data.meta._wp_manga_bookmark !== '') {
      bookmarks = response.data.meta._wp_manga_bookmark;
    } else {
      cFlag = true;
    }
    user = response.data.id;
    if (bookmarks.length > maxBookmarks) {
      bookmarks.shift();
    }
    bookmarkType = bookmarks.find( ({ id }) => id == toon) ? 0 : 1;
    if (bookmarkType == 0) {
      bookmarks = bookmarks.filter(function( obj ) {
        return obj.id != toon;
      });
    } else {
      bookmarks.push({id: `${toon}`, c: `${bookmark}`, p: '1', unread_c: []});
    }
  })
  .catch((error) => {
    isError = 1;
  })
  .finally(() => {
    if (isError == 1) {
      result(null, {code: 0, msg: "ERROR"});
    } else {
      if (cFlag == false) {
        sql.query(`UPDATE wp_usermeta SET meta_value = '${serialize(bookmarks)}' WHERE meta_key = '_wp_manga_bookmark' AND user_id = ?`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          if (bookmarkType == 0) {
            result(null, {code: 200, msg: "Successfully Removed Bookmark!"});
          } else {
            result(null, {code: 200, msg: "Successfully Added Bookmark!"});
          }
        });
      } else {
        sql.query(`INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, '_wp_manga_bookmark', '${serialize(bookmarks)}')`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          if (bookmarkType == 0) {
            result(null, {code: 200, msg: "Successfully Removed Bookmark!"});
          } else {
            result(null, {code: 200, msg: "Successfully Added Bookmark!"});
          }
        });
      }
      
    }
    
  });
  
};

Manga.doHistory= (token = "", history = 1, toon = 1, result) => {
  const maxHistory = 30;
  let histories = [];
  let bookmarks = [];
  let user = 0;
  let isError = 0;
  let historyType = 0; // 0 = Delete, 1 = Add
  let cFlag = false; // creation flag
  const api = axios.create({
    baseURL: `${adminConfig.WORDPRESS_URL}/wp-json/wp/v2/users/`,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    timeout: 10000,
  });
  api.get("me")
  .then((response) => {
    if (response.data.meta._wp_manga_history !== '') {
      histories = response.data.meta._wp_manga_history;
    } else {
      cFlag = true;
    }
    if (response.data.meta._wp_manga_bookmark !== '') {
      bookmarks = response.data.meta._wp_manga_bookmark;
      bookmarks.find( ({ id }) => id == toon).c = `${history}`;
    }
    user = response.data.id;
    if (history.length > maxHistory) {
      histories.shift();
    }
    historyType = histories.find( ({ id }) => id == toon) ? 0 : 1;
    let timestamp = Math.round((new Date()).getTime() / 1000);
    if (historyType == 0) {
      histories.find( ({ id }) => id == toon).c = `${history}`;
      histories.find( ({ id }) => id == toon).t = timestamp;
    } else {
      histories.push({id: `${toon}`, c: `${history}`, p: '1', i: '0', t: timestamp});
    }
  })
  .catch((error) => {
    isError = 1;
  })
  .finally(() => {
    if (isError == 1) {
      result(null, {code: 0, msg: "ERROR"});
    } else {
      if (cFlag == false) {
        sql.query(`UPDATE wp_usermeta SET meta_value = '${serialize(histories)}' WHERE meta_key = '_wp_manga_history' AND user_id = ?`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          sql.query(`UPDATE wp_usermeta SET meta_value = '${serialize(bookmarks)}' WHERE meta_key = '_wp_manga_bookmark' AND user_id = ?`, user, (err, res) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            if (historyType == 0) {
              result(null, {code: 200, msg: "Successfully Updated History!"});
            } else {
              result(null, {code: 200, msg: "Successfully Added History!"});
            }
          });
        });
      } else {
        sql.query(`INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, '_wp_manga_history', '${serialize(histories)}')`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          sql.query(`UPDATE wp_usermeta SET meta_value = '${serialize(bookmarks)}' WHERE meta_key = '_wp_manga_bookmark' AND user_id = ?`, user, (err, res) => {
            if (err) {
              console.log("error: ", err);
              result(null, {code: 0, msg: "ERROR"});
              return;
            }
            if (historyType == 0) {
              result(null, {code: 200, msg: "Successfully Updated History!"});
            } else {
              result(null, {code: 200, msg: "Successfully Added History!"});
            }
          });
        });
      }
      
    }
    
  });
  
};

Manga.giveCoins = (token = "", result) => {
  let isError = 0;
  let cFlags = [0, 0];
  let iCoins = Math.random();
  let user = 0;
  let timestamp = Math.round((new Date()).getTime() / 1000);
  iCoins = iCoins ** 3;
  iCoins *= 100;
  iCoins = Math.floor(iCoins) + 1;
  const api = axios.create({
    baseURL: `${adminConfig.WORDPRESS_URL}/wp-json/wp/v2/users/`,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    timeout: 10000,
  });
  api.get("me")
  .then((response) => {
    if (response.data.meta._user_coins_time == -1) {
      cFlags[1] = 1;
    }
    if (response.data.meta._user_coins == -1) {
      cFlags[0] = 1;
    }
    if ((timestamp - response.data.meta._user_coins_time) > 300 || response.data.meta._user_coins_time == -1) {
      timestamp += 300;
      user = response.data.id;
    } else {
      isError = 1;
    }
  })
  .catch((error) => {
    isError = 1;
  })
  .finally(() => {
    if (isError == 1) {
      result(null, {code: 0, msg: "ERROR"});
    } else {
      if (cFlags[0] == 0) {
        sql.query(`UPDATE wp_usermeta SET meta_value = ${timestamp} WHERE meta_key = '_user_coins_time' AND user_id = ?`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          if (cFlags[1] == 0) {
            sql.query(`UPDATE wp_usermeta SET meta_value = meta_value + ${iCoins} WHERE meta_key = '_user_coins' AND user_id = ?`, user, (err, res) => {
              if (err) {
                console.log("error: ", err);
                result(null, {code: 0, msg: "ERROR"});
                return;
              }
              result(null, {code: 200, msg: iCoins});
            });
          } else {
            sql.query(`INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, '_user_coins', ${iCoins})`, user, (err, res) => {
              if (err) {
                console.log("error: ", err);
                result(null, {code: 0, msg: "ERROR"});
                return;
              }
              result(null, {code: 200, msg: iCoins});
            });
          }
          
        });
      } else {
        sql.query(`INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, '_user_coins_time', ${timestamp})`, user, (err, res) => {
          if (err) {
            console.log("error: ", err);
            result(null, {code: 0, msg: "ERROR"});
            return;
          }
          if (cFlags[1] == 0) {
            sql.query(`UPDATE wp_usermeta SET meta_value = ${iCoins} WHERE meta_key = '_user_coins' AND user_id = ?`, user, (err, res) => {
              if (err) {
                console.log("error: ", err);
                result(null, {code: 0, msg: "ERROR"});
                return;
              }
              result(null, {code: 200, msg: iCoins});
            });
          } else {
            sql.query(`INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, '_user_coins', ${iCoins})`, user, (err, res) => {
              if (err) {
                console.log("error: ", err);
                result(null, {code: 0, msg: "ERROR"});
                return;
              }
              result(null, {code: 200, msg: iCoins});
            });
          }
          
        });
      }
    }
    
  });
  
};

module.exports = Manga;