const async = require('async');
const moment = require('moment');
const mysql = require('../libraries/database');
const api = require('../libraries/api');

const registerUserAchievements = (usersAchievements, userId, cb) => {
  if (!usersAchievements || !usersAchievements.length) {
    return cb();
  }
  async.each(usersAchievements, (usersAchievement, callback) => {
    let query = 'SELECT ID FROM USERSACHIEVEMENTS WHERE userID=? AND achievementID=?';
    let values = [
      userId,
      usersAchievement.id,
    ];
    mysql.query(query, values, (err, result) => {
      if (err) {
        return callback(err);
      }
      if (result && result[0]) {
        return callback();
      }
      query = 'INSERT IGNORE INTO USERSACHIEVEMENTS (userID, achievementID) VALUES ?';
      values = [];
      values.push([
        userId,
        usersAchievement.id,
      ]);
      mysql.query(query, [values], (err, result) => {
        return callback(err);
      });
    });
  }, err => cb(err));
};

const registerUserCursus = (cursusUsers, cb) => {
  if (!cursusUsers || !cursusUsers.length) {
    return cb();
  }
  let query = 'INSERT IGNORE INTO USERSCURSUS (id, grade, userID, cursusID, level, beginAt, endAt) VALUES ?';
  let values = [];
  cursusUsers.forEach((userCursus) => {
    let beginAt = new Date(userCursus.begin_at);
    let endAt;

    beginAt = moment(beginAt).format('YYYY-MM-DD HH:mm:ss');
    if (userCursus.end_at) {
      endAt = new Date(userCursus.end_at);
      endAt = moment(endAt).format('YYYY-MM-DD HH:mm:ss');
    }
    values.push([
      userCursus.id,
      userCursus.grade,
      userCursus.user.id,
      userCursus.cursus.id,
      userCursus.level,
      beginAt,
      endAt,
    ]);
  });
  mysql.query(query, [values], (err, result) => {
    if (err) {
      return cb(err);
    }
    async.each(cursusUsers, (userCursus, callback) => {
      let endAt;
      query = 'UPDATE USERSCURSUS SET grade=?, level=?, endAt=?, updated=now() WHERE ID=?';
      if (userCursus.end_at) {
        endAt = new Date(userCursus.end_at);
        endAt = moment(endAt).format('YYYY-MM-DD HH:mm:ss');
      }
      values = [
        userCursus.grade,
        userCursus.level,
        endAt,
        userCursus.id,
      ];
      mysql.query(query, values, (err, result) => {
        if (err) {
          return cb(err);
        }
        callback();
      });
    }, err => cb(err));
  });
};

const registerUserProjects = (usersProjects, userId, cb) => {
  if (!usersProjects || !usersProjects.length) {
    return cb();
  }
  let query = 'INSERT IGNORE INTO USERSPROJECTS (id, projectID, userID, status, validated, finalMark, markedAt, retries) VALUES ?';
  let values = [];
  usersProjects.forEach((project) => {
    let markedAt;
    if (project.marked_at) {
      markedAt = new Date(project.marked_at);
      markedAt = moment(markedAt).format('YYYY-MM-DD HH:mm:ss');
    }
    values.push([
      project.id,
      project.project.id,
      userId,
      project.status,
      project['validated?'],
      project.final_mark,
      markedAt,
      project.occurrence,
    ]);
  });
  mysql.query(query, [values], (err, result) => {
    if (err) {
      return cb(err);
    }
    async.each(cursusUsers, (userCursus, callback) => {
      query = 'UPDATE USERSPROJECTS SET status=?, validated=?, finalMark=?, markedAt=?, retries=?, updated=now() WHERE ID=?';
      let markedAt;
      if (project.marked_at) {
        markedAt = new Date(project.marked_at);
        markedAt = moment(markedAt).format('YYYY-MM-DD HH:mm:ss');
      }
      values = [
        project.status,
        project['validated?'],
        project.final_mark,
        markedAt,
        project.occurrence,
        project.id,
      ];
      mysql.query(query, values, (err, result) => {
        if (err) {
          return cb(err);
        }
        callback();
      });
    }, err => cb(err));
  });
};

const registerUserCampus = (campusUsers, cb) => {
  if (!campusUsers || !campusUsers.length) {
    return cb();
  }
  let query = 'INSERT IGNORE INTO USERSCAMPUS (ID, userID, campusID, isPrimary) VALUES ?';
  let values = [];
  campusUsers.forEach((userCampus) => {
    values.push([
      userCampus.id,
      userCampus.user_id,
      userCampus.campus_id,
      userCampus.is_primary,
    ]);
  });
  mysql.query(query, [values], (err, result) => {
    cb(err, result);
  });
};

const registerUser = (user, cb) => {
  let query = 'INSERT IGNORE INTO USERS (id, firstname, lastname, displayname, imageUrl, url, login, staff, poolMonth, poolYear) VALUES ?';
  let values = [];
  values.push([
    user.id,
    user.first_name,
    user.last_name,
    user.displayname,
    user.image_url,
    user.url,
    user.login,
    user['staff?'],
    user.pool_month,
    user.pool_year,
  ]);
  mysql.query(query, [values], (err, result) => {
    if (err) {
      return cb(err, result);
    }
    query = 'UPDATE USERS SET imageUrl=?, staff=?, poolMonth=?, poolYear=?, url=?, updated=now() WHERE ID=?';
    values = [
      user.image_url,
      user['staff?'],
      user.pool_month,
      user.pool_year,
      user.url,
      user.id,
    ];
    mysql.query(query, values, (err, result) => {
      if (err) {
        return cb(err, result);
      }
      mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
        if (err) {
          return cb(err, result);
        }
        registerUserCursus(user.cursus_users, (err, result) => {
          if (err) {
            return cb(err, result);
          }
          registerUserProjects(user.projects_users, user.id, (err, result) => {
            if (err) {
              return cb(err, result);
            }
            registerUserCampus(user.campus_users, (err, result) => {
              if (err) {
                return cb(err, result);
              }
              registerUserAchievements(user.achievements, user.id, (err, result) => {
                cb(err, result);
              });
            });
          });
        });
      });
    });
  });
};

const registerUsers = (users) => new Promise((resolve, reject) => {
  async.each(users, (user, callback) => {
    api.getUser(user.id)
      .then((userInfos) => {
        registerUser(userInfos, callback);
      }).catch(err => callback(err));
  }, (err) => {
    if (err) {
      return reject(err);
    }
    resolve();
  });
});

module.exports = registerUsers;
