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
    rows.removeClass('winner').mouseleave();

    $('html, body').animate({scrollTop: middle}, 500, function(){
      winner.effect('pulsate', {times:2}).addClass('winner').mouseenter();
    });
  });

  socket.on('clearEntries', function(){
    $('table#contest tbody tr').fadeOut(1000, function(){ $(this).remove(); });
  });

  var prependEntry = function(entry){
    target.prepend(template(entry)).children(':first').hide().fadeIn(1500);
  };

  //--- bindings

  $('#admin-link').click(function(){
    $(this).hide();
    $('#admin-area').show('blind');
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

  $('#name, #email').keyup(function(e){
    $('#save').removeClass('disabled');
    $(this).removeClass('error');
  });

  $('#save').click(function(e){
    e.preventDefault();
    var nameInput      = $('input#name');
    var emailInput     = $('input#email');
    var licenseSelect  = $('select#license');
    var newbieCheckbox = $('input#newbie');
    var submitButton   = $(this);
    var fields         = [nameInput, emailInput, licenseSelect, newbieCheckbox];
    var submittable    = true;
    var data           = {};
    var table          = $('table#contest tbody');

    $.each(fields, function(i, input){
      if(input.val() === ""){
        input.addClass('error');
        submitButton.addClass('disabled');
        submittable = false;
      } else {
        if(input.attr('type') === "checkbox"){
          var val = input.is(':checked') ? "Welcome!" : ""
        } else {
          var val = input.val();
        }

        input.removeClass('error');
        data[input.attr('id')] = val;
      }
    });

    if(submittable){
      data["hash"] = Crypto.MD5(emailInput.val());
      socket.emit('submitEntry', data);
      $('#new-entry-form').remove();
      $.each(fields, function(i, input){ input.val(''); });
    }
  });

  $('#random-entry').click(function(e){
    e.preventDefault();
    var rows   = $('table#contest tbody tr');
    var random = Math.ceil(Math.random() * rows.length);
    socket.emit('winnerChosen', random);
  });

  $('tbody tr').live({
    mouseenter: function(){$(this).find('td.gravatar img').stop().animate({width: "64px", height: "64px"}, 500);},
    mouseleave: function(){$(this).find('td.gravatar img').stop().animate({width: "24px", height: "24px"}, 500);}
  });

  $('#save-entries').click(function(){
    socket.emit('consumeEntries');
  });

  //--- page init

  $.each(window.entries, function(i, entry){
    prependEntry(entry);
  });
});
