var express = require('express');
var router = express.Router();
var request = require('request');
var Reminder = require('../models/reminder');
var accountsUrl = 'http://accounts.productiv.me/api';

getUser = function(req, res, next) {
  var uid = req.cookies['productivUid'];
  if(!uid) next();
  var url = accountsUrl + '/user/' + uid;
  request(url, function (err, _res, user) {
    if(err || _res.statusCode !== 200) {
      console.log('error retrieving user: ', err);
      console.log('status code: ', _res.statusCode);
      next();
    }
    else {
      req.user = JSON.parse(user);
      next();
    }
  });
};

validateToken = function(uid, token, next) {
  request.post({
    url: accountsUrl + '/token/validate',
    body: {
      uid: uid,
      token: token
    },
    json: true
  }, next);
};

auth = function(req, res, next) {
  var uid = req.cookies['productivUid'];
  var token = req.cookies['productivToken'];

  if(!uid || !token) res.redirect('/login');
  else {
    validateToken(uid, token, function (err, _res, body) {
      if(err || _res.statusCode !== 200) res.send(err);
      else if(body.success) next();
      else {
        console.log('message: ', body.message);
        res.redirect('/login');
      }
    });
  }
};

remindersByOwner = function(req, res, next) {
  var uid = req.cookies.productivUid;
  Reminder.find({ owner: uid }, function(err, reminders) {
    if(err) res.send(err);
    else {
      req.reminders = reminders;
      next();
    }
  });
};

sort = function(ary, comp) {
  var a = ary;
  a.sort(comp);
  return a;
};

sortRemindersByMostRecent = function(req, res, next) {
  req.reminders = sort(req.reminders, function(newer, older) {
    return older.createdAt - newer.createdAt;
  });
  next();
};

sortRemindersByIndex = function(req, res, next) {
  req.reminders = sort(req.reminders, function(first, second) {
    return first.index - second.index;
  });
  next();
};

router.get('/', auth, getUser, remindersByOwner, sortRemindersByIndex,
  function(req, res) {
    res.render('reminders', {
      reminders: req.reminders,
      user: req.user
    });
  });

router.get('/reminder/:id', reminderById, renderReminder);

router.get('/login', function(req, res) {
  res.render('login');
});

module.exports = router;