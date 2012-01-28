$ ->
  socket       = io.connect(window.location.hostname)
  source       = $("#entry-template").html()
  template     = Handlebars.compile(source)
  target       = $("tbody")

  prependEntry = (entry) ->
    presenter           = entry
    presenter.cssClass  = if entry.winner then "winner" else ""
    presenter.newToCrb  = if entry["new-to-crb"] then "Welcome!" else ""
    presenter.newToRuby = if entry["new-to-ruby"] then "Welcome!" else ""
    row = target.prepend(template(presenter)).children(":first").hide().fadeIn(1500)
    row.find('.gravatar img').mouseenter() if entry.winner

  clearWinner = ->
    $('.winner').removeClass("winner")
    $(".gravatar img").mouseleave()

  socket.on "newEntryPosted", (entry) ->
    prependEntry entry

  socket.on "hideWinner", (num) ->
    clearWinner()

  socket.on "showWinner", (num) ->
    rows   = $("table#contest tbody tr")
    winner = rows.eq(parseInt(num) - 1)
    middle = winner.offset().top - ($(window).height() / 2)
    clearWinner()
    $("html, body").animate {scrollTop: middle}, 500, ->
      winner.effect("pulsate", {times: 1}).addClass("winner").find(".gravatar img").mouseenter()

  socket.on "clearEntries", ->
    $("table#contest tbody tr").fadeOut 1000, ->
      $(this).remove()

  socket.on "updatedEntryCount", (count) ->
    $("#count").html count + " attendees"

  $("#admin-link").click ->
    $(this).hide()
    $("#admin-area").show "blind"
    $("#unlock-code").focus()

  $("#unlock-code").keyup (e) ->
    input = $(this)
    if input.val().length is window.length
      $.post "/unlock", {code: input.val()}, (response) ->
        if response is true
          $("#actions").show()
          input.val("").hide()
        else
          input.val ""

  $("#name, #email, #license").bind "keyup change", (e) ->
    $("#save").removeClass "disabled"
    $(this).removeClass "error"

  $("#save").click (e) ->
    e.preventDefault()
    nameInput          = $("input#name")
    emailInput         = $("input#email")
    twitterInput       = $("input#twitter")
    licenseSelect      = $("select#license")
    newToRubyCheckbox  = $("input#new-to-ruby")
    newToCrbCheckbox   = $("input#new-to-crb")
    submitButton       = $(this)
    fields             = [ nameInput, emailInput, twitterInput, licenseSelect, newToRubyCheckbox, newToCrbCheckbox ]
    submittable        = true
    data               = {}
    table              = $("table#contest tbody")
    validate           = (input, failure) ->
      if input.val() isnt failure then storeValue(input) else disableInput(input)

    disableInput = (input) ->
      input.addClass "error"
      submitButton.addClass "disabled"
      submittable = false

    storeValue = (input) ->
      input.removeClass "error"
      data[input.attr("id")] = input.val()

    $.each fields, (i, input) ->
      if input is nameInput or input is emailInput
        validate input, ""
      else if input is licenseSelect
        validate input, "Preferred License"
      else
        storeValue input

    if submittable
      data.hash    = Crypto.MD5(emailInput.val())
      data.twitter = data.twitter.replace("@", "")
      socket.emit "submitEntry", data
      $("#new-entry-form").remove()
      $.each fields, (i, input) -> input.val ""

  $("#clear-winner").click (e) ->
    e.preventDefault()
    socket.emit "winnerCleared"

  $("#random-entry").click (e) ->
    e.preventDefault()
    rows  = $("table#contest tbody tr")
    row   = Math.ceil(Math.random() * rows.length)
    email = rows.eq(row - 1).find(".email").html()
    socket.emit "winnerChosen", {row: row, email: email}

  $(".gravatar img").live
    mouseenter: -> $(this).stop().animate {width: "64px", height: "64px"}, 500
    mouseleave: -> $(this).stop().animate {width: "24px", height: "24px"}, 500

  $("#save-entries").click ->
    e.preventDefault()
    $("#admin-area").fadeOut 1000
    socket.emit "consumeEntries"

  $.each window.entries, (i, entry) ->
    prependEntry entry

