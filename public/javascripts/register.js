$(function(){
  var socket   = io.connect(window.location.hostname);
  var source   = $("#entry-template").html();
  var template = Handlebars.compile(source);
  var target   = $('tbody');

  //--- sockets

  socket.on('newEntryPosted', function(entry){
    prependEntry(entry);
  });

  socket.on('showWinner', function(num){
    var rows   = $('table#contest tbody tr');
    var winner = rows.eq(parseInt(num) - 1);
    var middle = winner.offset().top - ($(window).height() / 2);
    rows.removeClass('winner').find('.gravatar img').mouseleave();

    $('html, body').animate({scrollTop: middle}, 500, function(){
      winner.effect('pulsate', {times:1}).addClass('winner').find('.gravatar img').mouseenter();
    });
  });

  socket.on('clearEntries', function(){
    $('table#contest tbody tr').fadeOut(1000, function(){ $(this).remove(); });
  });

  socket.on('updatedEntryCount', function(count){
    $('#count').html(count + " attendees");
  });

  //--- bindings

  $('#admin-link').click(function(){
    $(this).hide();
    $('#admin-area').show('blind');
    $('#unlock-code').focus();
  });

  $('#unlock-code').keyup(function(e){
    var input = $(this);
    if(input.val().length === window.length){
      $.post('/unlock', {code: input.val()}, function(response){
        if(response === true){
          $('#actions').show();
          input.val('').hide();
        } else {
          input.val('');
        }
      });
    }
  });

  $('#name, #email, #license').bind("keyup change", function(e){
    $('#save').removeClass('disabled');
    $(this).removeClass('error');
  });

  $('#save').click(function(e){
    e.preventDefault();
    var nameInput         = $('input#name');
    var emailInput        = $('input#email');
    var twitterInput      = $('input#twitter');
    var licenseSelect     = $('select#license');
    var newToRubyCheckbox = $('input#new-to-ruby');
    var newToCrbCheckbox  = $('input#new-to-crb');
    var submitButton      = $(this);
    var fields            = [nameInput, emailInput, twitterInput, licenseSelect, newToRubyCheckbox, newToCrbCheckbox];
    var submittable       = true;
    var data              = {};
    var table             = $('table#contest tbody');

    var validate          = function(input, failure){
      (input.val() !== failure) ? storeValue(input) : disableInput(input);
    }

    var disableInput      = function(input){
      input.addClass('error');
      submitButton.addClass('disabled');
      submittable = false;
    }

    var storeValue        = function(input){
      input.removeClass('error');
      data[input.attr('id')] = input.val();
    }

    $.each(fields, function(i, input){
      if(input === nameInput || input === emailInput){
        validate(input, "");
      } else if(input === licenseSelect){
        validate(input, "Preferred License");
      } else {
        storeValue(input);
      }
    });

    data["twitter"] = data["twitter"].replace('@', '');

    if(submittable){
      data["hash"] = Crypto.MD5(emailInput.val());
      socket.emit('submitEntry', data);
      $('#new-entry-form').remove();
      $.each(fields, function(i, input){ input.val(''); });
    }
  });

  $('#random-entry').click(function(e){
    e.preventDefault();
    var rows  = $('table#contest tbody tr');
    var row   = Math.ceil(Math.random() * rows.length);
    var email = rows.eq(row - 1).find('.email').html();
    socket.emit('winnerChosen', {row: row, email: email});
  });

  $('.gravatar img').live({
    mouseenter: function(){$(this).stop().animate({width: "64px", height: "64px"}, 500);},
    mouseleave: function(){$(this).stop().animate({width: "24px", height: "24px"}, 500);}
  });

  $('#save-entries').click(function(){
    $('#admin-area').fadeOut(1000);
    socket.emit('consumeEntries');
  });

  //--- page init

  var prependEntry = function(entry){
    target.prepend(template(entry)).children(':first').hide().fadeIn(1500);
  };

  $.each(window.entries, function(i, entry){
    prependEntry(entry);
  });
});
