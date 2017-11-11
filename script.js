
function onLoadHome() {

};


function onLoadLogin() {
  //debugger;

  //Bind event handler to make AJAX call to invoke API Gateway for login lambda function
  $("#login-form-submit").click(function() {
      var formdata = {};
      formdata["username"] = $("#username").val();
      //Hash and salt the password:
      formdata["password"] = $("#password").val();
      debugger;
      $.ajax( 
        {
          method: "POST",
          url: "https://526ej4381h.execute-api.us-west-2.amazonaws.com/prod/SD-login",
          dataType: "json",
          data: formdata,
          async:true, 
          success: function(data) {
            //Success callback of API call
            alert("SUCCESS" + data);
          },
          error: function(data) {
            //Error callback of API call
            alert("ERROR" + JSON.stringify(data));
          }

        }
      ).done(function(data) {
        debugger;
        alert(data);
      });

      /*$.get("https://526ej4381h.execute-api.us-west-2.amazonaws.com/prod/SD-login", function(data) {
        alert(data);
      });*/
      
  });
};

/** called after events page is loaded */
function onLoadEvents() {
  /** Full calendarize the full calendar. */
  $('#calendar').fullCalendar({
      header: {
        left: 'prev,next',
        center: 'title',
        right: 'listYear,month'
      },
      
      googleCalendarApiKey: 'AIzaSyCFYaFiN0GneojBROLKmcWRhD4ZmvkzUGY',
    
      events: 'rpld7flhubtpukqak1oedei0u4@group.calendar.google.com',
      
      defaultView: 'listYear',

      eventClick: function(event) {
        // opens events in a popup window
        window.open(event.url, 'gcalevent', 'width=700,height=600');
        return false;
      },
      
      loading: function(bool) {
        $('#loading').toggle(bool);
      }
      
    });
  
};

/** Cache, hashchange */
var cache = new Object();

/** Hash-change, simple cache function */
$(function() {
    //debugger;
    //cache[''] = $('<div class="item">').appendTo("#content-container").load('home.html');
    $(window).hashchange(function() {

      //alert("hashchange");

      var url = window.location.hash.replace('#', '');
      if(url == "") {
        url = "home.html";
      }
      
      $("#content-container").children(":visible").hide();
      
      if ( cache[url] ) {  
        //debugger;
        cache[url].show();
      } else {
          cache[url] = $('<div class="item">').appendTo("#content-container").load(url, function() {
          $("#content-container").ready(function() {
            if(url == "home.html") onLoadHome();
            else if (url == "events.html") onLoadEvents();
            else if (url == "login.html") onLoadLogin();
          });

        });

      }
      /** THIS IS BAD OO! Every time you change or remove a link, you need to change this. WTF KYLE? */
      /** boldify nav links */
      $(".update-content").each(function(index) {
        if(this.hash.replace("#","") == url) $(this).css("font-weight","bold");
        else $(this).css("font-weight","normal");
      });
      /*
      if (url == "home.html")  $("#navDiscussion").css("font-weight","bold");
      else if (url == "events.html")  $("#navEvents").css("font-weight","bold");
      else if (url == "contact.html")  $("#navContact").css("font-weight","bold");
      else if (url == "login.html")  $("#navLogin").css("font-weight","bold");*/
    });


    $(window).hashchange();

});