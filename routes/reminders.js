var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Reminder = require('../models/reminder');

handleError = function(res, callback) {
  return function(err, arg) {
    if(err) res.send({ success: false, message: err });
    else callback(arg);
  };
};

reminderById = function(req, res, next) {
  var id = req.reminderId || req.params.id;
  Reminder.findOne({ _id: id }, handleError(res, function(reminder) {
    req.reminder = reminder;
    next();
  }));
};

remindersByOwner = function(req, res, next) {
  var id = req.ownerId || req.userId || req.params.uid;
  Reminder.find({ owner: id }, handleError(res, function(reminders) {
    req.reminders = reminders;
    next();
  }));
};

sendUserReminders = function(req, res) {
  Reminder.find({ owner: req.uid }, handleError(res, function(reminders) {
    res.send(reminders);
  }));
};

createReminder = function(req, res, next) {
  Reminder.create(req.reminder, handleError(res, function(newReminder) {
    req.reminder = newReminder;
    next();
  }));
};

renderReminder = function(req, res) {
  res.render('reminder', { reminder: req.reminder }, handleError(res, function(html) {
    res.send({ success: true, data: html });
  }));
};

sendReminder = function(req, res) {
  res.send({ success: true, data: req.reminder });
}

renderOrSendReminder = function(req, res) {
  if(req.render) renderReminder(req, res);
  else sendReminder(req, res);
};

parseJson = function(str, options) {
  if(typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch(err) {
    if(options && options.verbose) console.log(err);
    return str;
  }
};

router.post('/reminder', function(req, res, next) {
  var body = req.body;
  var reminder = parseJson(body.data, { verbose: true });
  var render = !!body.render;

  reminder.isDone = false;
  reminder.index = Infinity;
  reminder.createdAt = new Date();

  req.reminder = reminder;
  req.render = render;

  next();
}, createReminder, renderOrSendReminder);

router.get('/reminder/:id', reminderById, renderOrSendReminder);

router.put('/reminder/:id', function(req, res, next) {
  var reminderId = req.params.id;
  var reminder = parseJson(req.body.data, { verbose: true });
  Reminder.findOneAndUpdate({ _id: reminderId }, reminder, handleError(res, function(newReminder) {
    req.reminder = newReminder;
    next();
  }));
}, renderOrSendReminder);

router.delete('/reminder/:id', function(req, res) {
  var reminderId = req.params.id;
  Reminder.remove({ _id: reminderId }, handleError(res, function() {
    res.send({ success: true });
  }));
});

router.get('/reminders/:uid', remindersByOwner, function(req, res) {
  res.send({ success: true, data: res.reminders })
});

router.get('/reminder/all', function(req, res) {
  Reminder.find({}, handleError(res, function(reminders) {
    res.send(reminders);
  }));
});

router.post('/reminder/reorder', function(req, res, next) {
  var ids = parseJson(req.body.data, { verbose: true });
  ids.map(function(id, i) {
    Reminder.findOneAndUpdate({ _id: id }, { index: i+1 }, function(err) {
      if(err) res.send({ success: false, error: err });
    });
  });
  res.send({ message: "reordering reminders" });
});

module.exports = router;
