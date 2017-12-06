//Window hashchange function
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
      bindOnce($("#logout-button"), function() { 
              deleteCookie("token");
              deleteCookie("username");
          });
    
      /** boldify nav links */
      $(".update-content").each(function(index) {
        if(this.hash.replace("#","") == url) $(this).css("font-weight","bold");
        else $(this).css("font-weight","normal");
      });

      

    });

    $(window).hashchange();

});

function bindOnce(button, callback) {
  if(!button.hasClass("click-bound")) {
    button.addClass("click-bound");
    button.click(callback);
  }
}

function onLoadHome() {
    //$("#home-content").append("Welcome " + data.firstname + "!<br>Username: " + data.username + "<br>" + data.email + "<br>Email verified? " + data.verified + "<br>");
  var tokendata = {'token': readCookie('token')};
  $.ajax( 
  {
    method: "POST",
    url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/get-threads",
    dataType: "json",
    data: JSON.stringify(tokendata),
    crossdomain: true,
    async:true, 
    success: function(data, textStatus, xhr) {
      //Success callback of API call
      
      console.log("SUCCESS " + JSON.stringify(data) + "\n");
      data.sort(compareTimes);
      data.forEach(function(element){
        $("#threads").append(
          "<div class='row-fluid thread-div'>" +
              "<div class='row-fluid subject-div'>" + element.Subject + "</div>" +
              "<div class='row-fluid body-div'>" + element.Body + "</div>" +
              "<div class='row-fluid posteby-div'>Posted by: " + element.PostedBy + "<br>" + new Date(parseInt(element.Time)) + "</div>" +
              "<div class='replies-div' id='replies-" + element.Id + "'></div>" +
              "<input id='e" + element.Id + "' class='expand-button' value='expand' type='button' />" + 
              "<input id='r" + element.Id + "' class='reply-button' value='reply' type='button' />" +
          "</div><br>");
      });

      $(".expand-button").click(function() {
        var formdata = {};
        formdata.token = readCookie('token'),
        formdata.threadId = $(this).attr('id').substring(1); 
        var repliesDiv = '#replies-' + $(this).attr('id').substring(1);
        $.ajax( 
          {
            method: "POST",
            url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/get-replies",
            dataType: "json",
            data: JSON.stringify(formdata),
            crossdomain: true,
            async:true, 
            success: function(data, textStatus, xhr) {
              data.sort(compareTimes);
              data.forEach(function(element){
                $(repliesDiv).append(
                  "<div class='row-fluid reply-div'>" +
                      "<div class='row-fluid body-div'>" + element.Body + "</div>" +
                      "<div class='row-fluid posteby-div'>Posted by: " + element.PostedBy + "<br>" + new Date(parseInt(element.Time)) + "</div>" +
                  "</div><br>");
              } );
            },
            error: function(xhr, textStatus, err) {
              console.log("ERROR " + JSON.stringify(xhr));
              if(xhr.status == 403) window.location.hash = "#login.html";
            }

          }
        );
      });

      $(".reply-button").click(function() {
        console.log('click');
        var formdata = {};
        formdata.token = readCookie('token');
        formdata.threadId = $(this).attr('id').substring(1);
        formdata.body = $("#thread-body-input").val();

        $.ajax( 
          {
            method: "POST",
            url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/post-reply",
            dataType: "json",
            data: JSON.stringify(formdata),
            crossdomain: true,
            async:true, 
            success: function(data, textStatus, xhr) {
              console.log("SUCCESS " + JSON.stringify(data) + "\n");
              window.location.hash = "#home.html";
              $(window).hashchange();
            },
            error: function(xhr, textStatus, err) {
              console.log("ERROR " + JSON.stringify(xhr));
              if(xhr.status == 403) window.location.hash = "#login.html";
            }

          }
        );
      });


      
    },
    error: function(xhr, textStatus, err) {
      //Error callback of API call
      console.log("STATUS " + xhr.status + "ERROR " + JSON.stringify(xhr));
      if(xhr.status == 403) window.location.hash = "#login.html";

    }

  });

  
  bindOnce($("#thread-submit"), function() {
    var formdata = {};

    formdata.token = readCookie('token');

    formdata.subject = $("#thread-subject-input").val();
    formdata.body = $("#thread-body-input").val();

    $.ajax( 
      {
        method: "POST",
        url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/post-thread",
        dataType: "json",
        data: JSON.stringify(formdata),
        crossdomain: true,
        async:true, 
        success: function(data, textStatus, xhr) {
          console.log("SUCCESS " + JSON.stringify(data) + "\n");
          window.location.hash = "#home.html";
          $(window).hashchange();
        },
        error: function(xhr, textStatus, err) {
          console.log("ERROR " + JSON.stringify(data));
          if(xhr.status == 403) window.location.hash = "#login.html";
        }

      }
    );

    
  });

  


};

function onLoadPeople() {
  var tokendata = {'token': readCookie('token')}; 
  $.ajax( 
      {
        method: "POST",
        url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/get-users",
        dataType: "json",
        data: JSON.stringify(tokendata),
        crossdomain: true,
        async:true, 
        statusCode : {
          403 : function() {
            window.location.hash = "#login.html";
          }
        },
        success: function(data, textStatus, xhr) {
          //Success callback of API call
          
          console.log("SUCCESS " + JSON.stringify(data) + "\n");
          data.forEach(function(element){
            $("#people-content").append("Username: " + element.username + "  Name: " + element.firstname + " " + element.lastname + "  email: " + element.email + " verified? " + element.verified + "<br>");
          } );
          
        },
        error: function(xhr, textStatus, err) {
          //Error callback of API call
          console.log("ERROR " + JSON.stringify(xhr));
          if(xhr.status == 403) window.location.hash = "#login.html";

        }

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
        url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/validate-token",
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
          url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/login",
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
    var formdata = {};

    formdata.username = $("#register-username-input").val();
    formdata.password = $("#register-password-input").val();
    formdata.email = $("#register-email-input").val();
    formdata.firstname = $("#register-first-name-input").val();
    formdata.lastname = $("#register-last-name-input").val();
    if(validateFields(formdata)) {
      
      $.ajax( 
        {
          method: "POST",
          url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/register-user",
          dataType: "json",
          data: JSON.stringify(formdata),
          crossdomain:true,
          async:true, 
          success: function(data) {
            console.log("SUCCESS" + JSON.stringify(data));
            $.ajax( 
              {
                method: "POST",
                url: "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/beta/login",
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


//Save a cookie
function createCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

//Retreive cookie.
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

var deleteCookie = function(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

//Validates the password for registering.
function validatePassword(password) {
  confirm = $("#register-confirm-password-input").val();

  if(password !== confirm) {
    $("#reg-error").html("Passwords do not match");
    return false;
  }
  else if(password.length < 6) {
    $("#reg-error").html("Password must be at least 6 characters long");
    return false
  }
  else return true;
}


/** Validates email address */
function validateEmail(email) {  
    if(!(isString(email) && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
      $("#reg-error").html("Invalid email address.");
      return false;
    }  
    else return true;
} 

/** Validates email address */
function validateUsername(username) {  
    if(!isString(username)) {
      $("#reg-error").html("Invalid username. Pls enter a string (how did you not?)");
      return false;
    }  
    else return true;
} 

/** Validates First Name */
function validateFirstName(firstname) {  
    if(!isString(firstname) && firstname.length > 0) {
      $("#reg-error").html("Invalid first name.");
      return false;
    }  
    else return true;
} 

/** Validates Last Initial */
function validateLastName(lastname) {  
    if(!isString(lastname) && lastname.length > 0) {
      $("#reg-error").html("Invalid last name.");
      return false;
    }
    else if(lastname.length > 1) {
      $("#reg-error").html("Please enter only your last initial, to preserve anonymity.");
      return false;
    }
    else return true;
} 

/** Validates all of the user registration fields */
function validateFields(data) {
    return (validateUsername(data.username) && validateFirstName(data.firstname) && validateLastName(data.lastname) && validateEmail(data.email) && validatePassword(data.password));                         
}

/** Tests typeof data is string */
function isString(data) {
    return (typeof data === 'string');
}


//Used for sorting function for threads.  Compares two time values (newest first)
function compareTimes(a,b) {
  if (a.Time > b.Time)
    return -1;
  if (a.Time < b.Time)
    return 1;
  return 0;
}