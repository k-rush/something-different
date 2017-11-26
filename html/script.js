
function onLoadHome() {
    validateAndRun(function(data) {
      $("#home-content").append("Welcome " + data.firstname + "!<br>Username: " + data.username + "<br>" + data.email + "<br>Email verified? " + data.verified + "<br><br>You are now authorized to view sensitive data.");
    });
};

function onLoadPeople() {
  validateAndRun(function(loginData) {
    var tokendata = {'token': readCookie('token')}; 
    $.ajax( 
        {
          method: "POST",
          url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/get-users",
          dataType: "json",
          data: JSON.stringify(tokendata),
          crossdomain: true,
          async:true, 
          success: function(data) {
            //Success callback of API call
            
            console.log("SUCCESS " + JSON.stringify(data) + "\n");
            data.forEach(function(element){
              $("#people-content").append("Username: " + element.username + "  Name: " + element.firstname + " " + element.lastname + "  email: " + element.email + "<br>");
            } );
            
          },
          error: function(data) {
            //Error callback of API call
            console.log("ERROR " + JSON.stringify(data));
            window.location.hash = "#login.html";

          }

        }
      );
  });
}

//Validates login token and runs callback function.
function validateAndRun(callback) {

  var tokendata = {'token': readCookie('token')};   
  //$("#debug-div").append(logindata.username + " " + logindata.password + "<br>");

  //Make API call to validate token (test)
  $.ajax( 
      {
        method: "POST",
        url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/validate-token",
        dataType: "json",
        data: JSON.stringify(tokendata),
        crossdomain: true,
        async:true, 
        success: function(data) {
          //Success callback of API call
          
          console.log("SUCCESS " + JSON.stringify(data) + "\n");
          callback(data);
        },
        error: function(data) {
          //Error callback of API call
          console.log("ERROR " + JSON.stringify(data));
          window.location.hash = "#login.html";

        }

      }
    );

};


function onLoadLogin() {
  //Make API call to validate token (test)

  //Bind event handler to make AJAX call to invoke API Gateway for login lambda function
  $("#login-form-submit").click(function() {
      var formdata = {};

      formdata.username = $("#login-username-input").val();
      formdata.password = $("#login-password-input").val();

      $.ajax( 
        {
          method: "POST",
          url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/login",
          dataType: "json",
          data: JSON.stringify(formdata),
          crossdomain: true,
          async:true, 
          success: function(data) {
            $("#debug-div").append("Login Succeeded. TOKEN: " + data.token + "<br>");
            createCookie('token',data.token,1);
            createCookie('username',formdata['username'],1);
            console.log("SUCCESS " + JSON.stringify(data) + "\n");
            window.location.hash = "#home.html";
          },
          error: function(data) {
            console.log("ERROR " + JSON.stringify(data));
          }

        }
      );

      
  });
};

function onLoadRegister() {

  //Bind event handler to make AJAX call to invoke API Gateway for login lambda function
  $("#register-form-submit").click(function() {
      if(validatePassword()) {
        var formdata = {};

        formdata.username = $("#register-username-input").val();
        formdata.password = $("#register-password-input").val();
        formdata.email = $("#register-email-input").val();
        formdata.firstname = $("#register-first-name-input").val();
        formdata.lastname = $("#register-last-name-input").val();

        $.ajax( 
          {
            method: "POST",
            url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/register-user",
            dataType: "json",
            data: JSON.stringify(formdata),
            crossdomain:true,
            async:true, 
            success: function(data) {
              console.log("SUCCESS" + JSON.stringify(data));
              $.ajax( 
                {
                  method: "POST",
                  url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/login",
                  dataType: "json",
                  data: JSON.stringify(formdata),
                  crossdomain: true,
                  async:true, 
                  success: function(data) {
                    $("#debug-div").append("Login Succeeded. TOKEN: " + data.token + "<br>");
                    createCookie('token',data.token,1);
                    createCookie('username',formdata['username'],1);
                    console.log("SUCCESS " + JSON.stringify(data) + "\n");
                    window.location.hash = "#home.html";
                  },
                  error: function(data) {
                    console.log("ERROR " + JSON.stringify(data));
                  }

                }
              );

            },
            error: function(data) {
              console.log("ERROR" + JSON.stringify(data));
            }

          }
        );

      }
  });
};

/** called after events page is loaded */
function onLoadEvents() {
  validateAndRun(function(data) {
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
  });
  
};


$(function() {
    $(window).hashchange(function() {

      var url = window.location.hash.replace('#', '');
      if(url == "") {
        url = "home.html";
      }
      
      $("#content-container").empty();

      $('<div class="item">').appendTo("#content-container").load(url, function() {
        $("#content-container").ready(function() {
          if(url == "home.html") onLoadHome();
          else if (url == "events.html") onLoadEvents();
          else if (url == "login.html") onLoadLogin();
          else if (url == "register.html") onLoadRegister();
          else if (url == "people.html") onLoadPeople();
        });

      });

    
      /** boldify nav links */
      $(".update-content").each(function(index) {
        if(this.hash.replace("#","") == url) $(this).css("font-weight","bold");
        else $(this).css("font-weight","normal");
      });

    });

    $(window).hashchange();

});

function createCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function validatePassword() {
  //debugger;
  password = $("#register-password-input").val();
  confirm = $("#register-confirm-password-input").val();

  
  if(password !== confirm) {
    alert("Passwords do not match!");
    return false;
  }
  else if(password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return false
  }
  else return true;
}