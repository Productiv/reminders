var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var ObjectId     = mongoose.Schema.Types.ObjectId;

var ReminderSchema = new Schema({
  owner: ObjectId,
  title: String,
  isDone: Boolean,
  createdAt: Date,
  remindTime: Date,
  index: Number
});

module.exports = mongoose.model('Reminder', ReminderSchema);