onClickTitle = function(e) {
  var title = $(this).html();
  var $reminder = $(this).parents('.reminder');
  $reminder.data('title', title);
  $(this).remove();
  $reminder.append('<input class="title-input" type="text"/>');
  $reminder.attr('draggable', false);

  var $input = $reminder.children('.title-input');
  $input.keydown(onKeydownTitle)
        .val(title)
        .focus()
        .focusout(submitTitle);

  // Move cursor to end of input
  var tmpStr = $input.val();
  $input.val('');
  $input.val(tmpStr);
};

onKeydownTitle = function(e) {

  // Press Enter
  if(e.which === 13 && $(this).val() === '') removeReminder.call(this, e);
  else if(e.which === 13) submitTitle.call(this, e);

  if(e.which === 27) {
    renderTitle($(this).parents('.reminder'));
  }
};

onCheckChange = function(e) {
  e.preventDefault();
  console.log('test');

  var $reminder = $(this).parents('.reminder');
  var isDone = this.checked;
  var id = $reminder.attr('id');

  if($reminder.parents('.reminders').hasClass('hide-done')) {
    $reminder.fadeOut('300', function(e) {
      $(this).toggleClass('done').attr('style', '');
    });
  } else $reminder.toggleClass('done');

  showUndo('Reminder completed.', function() {
    updateReminder(id, { isDone: isDone }, function(res) { console.log(res); });
  }, function() {
    $reminder.find('.check').attr('checked', !isDone);
    $reminder.removeClass('done');
  });

  $reminder.children('.title-input').focus();
};

reloadReminder = function(id) {
  $reminder = $('#'+id);
  getReminder(id, function(res, success) {
    if(!success) console.log(res);
    $reminder.replaceWith(res);
  });
}

showUndo = function(message, action, undoAction) {
  $('.notice').html('<span class="message">' + message + '</span> ' +
                    '<a class="undo" href="#"> Undo </a>')
  $('.notice').fadeIn(0);

  // Could cause race conditions, etc.
  setTimeout(function() { $('.notice').fadeOut(2000); }, 3000);
  window.onbeforeunload = action;
  window.undo_timeout = setTimeout(function() {
    action();
    window.onbeforeunload = null;
  }, 5000);

  $('.undo').click(function(e) {
    e.preventDefault();
    window.onbeforeunload = null
    $('.notice').stop().fadeOut(0);
    clearTimeout(window.undo_timeout);
    undoAction();
  });
};

renderTitle = function($reminder, title) {
  var title = title || $reminder.data('title');
  $reminder.data('title', '');
  $reminder.children('.title-input').remove();
  $reminder.append('<span class="title">' + title + '</span>');
  $reminder.children('.title').click(onClickTitle);
  $reminder.attr('draggable', true);
};

removeReminder = function(e) {
  e.preventDefault();

  var $reminder = $(this).parents('.reminder');
  $reminder.fadeOut('300');
  if($reminder.children('.title-input').length > 0) renderTitle($reminder);

  showUndo('Task deleted.', function() {
    $reminder.remove();
    deleteReminder($reminder.attr('id'), function(res) {
      console.log(res);
    });
  }, function() {
    $reminder.show();
  });
};

submitTitle = function(e) {
  e.preventDefault();
  var $reminder = $(this).parents('.reminder');
  var title = $(this).val();
  renderTitle($reminder, title);
  updateReminder($reminder.attr('id'), { title: title }, function(res, success) {
    console.log('update title res: ', res);
  });
};

getReminder = function(id, callback) {
  var url = '/api/reminder/' + id;
  $.get(url, callback);
};

renderReminder = function(id, callback) {
  var url = '/api/reminder/' + id;
  $.get(url, { render: true }, callback);
};

renderNewReminder = function(reminder, callback) {
  $.post('/api/reminder', { data: JSON.stringify(reminder), render: true }, callback);
};

updateReminder = function(id, reminder, callback) {
  var url = '/api/reminder/' + id;
  $.put(url, { data: JSON.stringify(reminder) }, callback);
};

deleteReminder = function(id, callback) {
  var url = '/api/reminder/' + id;
  $.delete(url, callback);
};

reorderReminders = function(ids, callback) {
  $.post('/api/reminder/reorder', { data: JSON.stringify(ids) }, callback);
};

saveReminderOrder = function() {
  var ids = $.map($('.reminder'), function(reminder) { return $(reminder).attr('id'); });
  reorderReminders(ids, function(res) { console.log(res); });
};

logout = function(callback) {
  return function(e) {
    e.preventDefault();
    var uid = getCookie('productivUid');
    $.post('http://accounts.productiv.me/api/logout', {
      uid: uid
    }, callback);
  };
};

sortRemindersByDone = function(dir) {
  var first = (dir === 'asc') ? -1 : 1;
  var second = (dir === 'asc') ? 1 : -1;
  var items = $('.reminder');
  items.sort(function(a, b) {
    if($(a).hasClass('done') && !$(b).hasClass('done'))      return first;
    else if(!$(a).hasClass('done') && $(b).hasClass('done')) return second;
    else return 0;
  });
  $('.reminders').html(items);
  $('.sortable').sortable('reload');
};

sortRemindersByIndex = function() {
  var items = $('.reminder');
  items.sort(function(a, b) {
    return a.index - b.index;
  });
  $('.reminders').html(items);
  $('.sortable').sortable('reload');
};

setShowDone = function() {
  if(getCookie('productivShowDone') === 'true') {
    $('.show-done').html('Done: Show');
    $('.reminders').removeClass('hide-done');
  } else {
    $('.show-done').html('Done: Hidden');
    $('.reminders').addClass('hide-done');
  }
};

$(function() {
  // Load settings from cookie
  setShowDone();

  $('.add-reminder').keydown(function(e) {
    if(e.which !== 13) return;

    var title = $(this).val();
    var uid = getCookie('productivUid');

    renderNewReminder({ title: title, owner: uid }, function(res) {
      console.log('res: ', res);
      if(!res.success) console.log(res.message);
      else {
        $('.reminders').prepend(res.data);
        $('.add-reminder').val('');
        var $reminder = $('.reminders').children('.reminder').first();
        console.log($reminder);
        $reminder.children('.title').click(onClickTitle);
        $reminder.children('.remove').click(removeReminder);
        $reminder.find('.check').change(onCheckChange);
        saveReminderOrder();
        $('.sortable').sortable('reload');
      }
    });
  });

  $('.reminder .check').change(onCheckChange);

  $('.reminder .title').click(onClickTitle);

  $('.sortable').sortable({
    forcePlaceholderSize: true,
    items: ':not(.disabled)'
  }).bind('sortupdate', saveReminderOrder);

  $('.logout').click(logout(function(res) {
    if(!res.success) console.log(res);
    else location.href = '/login';
  }));

  hoverShowDone = function(e) {
    if(getCookie('productivShowDone') === 'true')
      $('.show-done').html('Done: Hide');
    else
      $('.show-done').html('Done: Show');
  };

  $('.show-done').click(function(e) {
    var show = getCookie('productivShowDone');
    if(show === 'true') setCookie('productivShowDone', 'false');
    else setCookie('productivShowDone', 'true');
    setShowDone();
  }).hover(hoverShowDone, setShowDone);

  $('.reminder .remove').click(removeReminder);

  $('.done-to-bottom').click(function(e) {
    sortRemindersByDone('desc');
    saveReminderOrder();
  });

});