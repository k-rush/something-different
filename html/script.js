const API = "https://nkfpt8zca8.execute-api.us-west-2.amazonaws.com/prod/prod/";

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
          else if (url == "files.html") onLoadFiles();
        });

      });


      bindOnce($("#navLogout"), logout);
      if(!readCookie("token")) {
        $(".secure-nav").hide();
        $("#navLogin").show();
        $("#navRegister").show();
      }
      else {
        $(".secure-nav").show();
        $("#navLogin").hide();
        $("#navRegister").hide();
      }
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
    url: API + "get-threads",
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
          "<div class='row-fluid thread-div' id='t" + element.Id + "'>" +
              "<div class='row-fluid subject-div'><h3>" + element.Subject + "</h3></div>" +
              "<div class='row-fluid body-div'><p>" + element.Body + "</p></div>" +
              "<div class='row-fluid postedBy-div'> - " + element.PostedBy + "<br>" + new Date(parseInt(element.Time)).toLocaleString() + "</div>" +
              "<div class='replies-div' id='replies-" + element.Id + "'></div>" +
              "<input id='expand-" + element.Id + "' class='expand-button' value='replies' type='button' /><br>" + 
              "<input id='retract-" + element.Id + "' class='retract-button' value='hide replies' type='button' /><br>" + 
          "</div><br>");

      });

      $('.retract-button').hide();

      bindOnce($(".expand-button"), function() {
        var formdata = {};
        formdata.token = readCookie('token'),
        formdata.threadId = $(this).attr('id').substring(7); 
        var repliesDiv = $('#replies-' + $(this).attr('id').substring(7));
        getReplies(formdata, repliesDiv);
        
      });

      

      bindOnce($(".retract-button"), function() {
        var repliesDiv = $('#replies-' + $(this).attr('id').substring(8));
        repliesDiv.empty();
        repliesDiv.removeClass('expanded');
        $(this).hide();
        $("#expand-" + $(this).attr('id').substring(8)).show();
      });

      $('#show-post').click(function(){
        if($(this).prop("value") === "post") $(this).prop("value", "hide");
        else $(this).prop("value", "post")
          $('#thread-form').slideToggle();
      });


      
    },
    error: function(xhr, textStatus, err) {
      //Error callback of API call
      console.log("STATUS " + xhr.status + "ERROR " + JSON.stringify(xhr));
      if(xhr.status == 403)  logout();

    }

  });

  
  bindOnce($("#thread-submit"), function() {
    $(this).attr('disabled',true);    
    var formdata = {};

    formdata.token = readCookie('token');

    formdata.subject = $("#thread-subject-input").val();
    formdata.body = $("#thread-body-input").val();

    $.ajax( 
      {
        method: "POST",
        url: API + "post-thread",
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
          if(xhr.status == 403) logout();
        }

      }
    );

    
  });

  $("#thread-subject-input,#thread-body-input").keydown(function(e) {
    if (e.keyCode == 13) {
        $("#thread-submit").click();
    }
  });
};



function logout() {
  deleteCookie("token");
  deleteCookie("username");
  $(".secure-nav").hide();
  $("#navLogin").show();
  $("#navRegister").show();
  window.location.hash = "#login.html";
}

function getReplies(formdata, repliesDiv) {

  $.ajax( 
    {
      method: "POST",
      url: API + "get-replies",
      dataType: "json",
      data: JSON.stringify(formdata),
      crossdomain: true,
      async:true, 
      success: function(data, textStatus, xhr) {
        repliesDiv.empty();
        data.sort(compareTimesAsc);
        data.forEach(function(element){
          repliesDiv.append(
            "<div class='row-fluid'>" +
                "<div class='row-fluid body-div'><p>" + element.Body + "</p></div>" +
                "<div class='row-fluid postedBy-div'> - " + element.PostedBy + "<br>" + new Date(parseInt(element.Time)).toLocaleString() + "</div>" +
            "</div><br>");
        } );
        repliesDiv.append("<input id='b" + formdata.threadId + "' class='reply-body' type='textarea' /><br>" +
              "<input id='r" + formdata.threadId + "' class='reply-button' value='post' type='button' /></div>");
        

        repliesDiv.addClass('expanded');
        $("#expand-" + formdata.threadId).hide();
        $("#retract-" + formdata.threadId).show();

        //Bind click event to reply button.
        bindOnce($("#r" + formdata.threadId), function() {
          var replyButton = $(this);
          replyButton.attr('disabled',true).hide();   
          
          var threadId = replyButton.attr('id').substring(1);
          var replyBody = $("#b" + threadId);
          replyBody.hide();

          console.log('click');

          var repliesDiv = $('#replies-' + replyButton.attr('id').substring(1));

          var formdata = {};
          formdata.token = readCookie('token');
          formdata.threadId = threadId;
          formdata.body = $("#b" + threadId).val();

          $.ajax( 
            {
              method: "POST",
              url: API + "post-reply",
              dataType: "json",
              data: JSON.stringify(formdata),
              crossdomain: true,
              async:true, 
              success: function(data, textStatus, xhr) {
                console.log("SUCCESS " + JSON.stringify(data) + "\n");
                
                getReplies(formdata, repliesDiv);
              },
              error: function(xhr, textStatus, err) {
                console.log("ERROR " + JSON.stringify(xhr));
                if(xhr.status == 403) logout();
                else {
                  replyBody.show();
                  replyButton.attr('disabled',false);
                  replyButton.show(); 
                }

              }

            }
          );
        });
        $("#b" + formdata.threadId).keydown(function(e) {
          if (e.keyCode == 13) {
              $("#r" + formdata.threadId).click();
          }
        });
      },
      error: function(xhr, textStatus, err) {
        console.log("ERROR " + JSON.stringify(xhr));
        if(xhr.status == 403) logout();
      }

    }
  );
}

function onLoadPeople() {
  var tokendata = {'token': readCookie('token')}; 
  $.ajax( 
      {
        method: "POST",
        url: API + "get-users",
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
            $("#people-content").append("<div class='user-div'>" + element.firstname + " " + element.lastname + "<br>Username: " + element.username + "<br>" + element.email + "<br></div>");
          } );
          
        },
        error: function(xhr, textStatus, err) {
          //Error callback of API call
          console.log("ERROR " + JSON.stringify(xhr));
          if(xhr.status == 403) logout();

        }

  });
}

function onLoadFiles() {
  validateAndRun( function() {
    $.ajax( 
        {
          method: "GET",
          url: "http://something-different.s3.amazonaws.com",
          dataType: "json",
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
            var parser = new DOMParser();
            var response = parser.parseFromString(data,"text/xml");
            $("#files-content").append(response.getElementsByTagName("Key")[0].childNodes[0].nodeValue);

          },
          error: function(xhr, textStatus, err) {
            //Error callback of API call
            console.log("ERROR " + JSON.stringify(xhr));
            if(xhr.status == 403) logout();

            //TODO: why am I getting 200 status and error callback?
            if(xhr.status == 200) {
              var parser = new DOMParser();
              var response = parser.parseFromString(xhr.responseText,"text/xml");
              var fileKeys = response.getElementsByTagName("Key");
              for(var i = 0; i < fileKeys.length; i++) {
                $("#files-content").append('<a class="file-link" target="_blank" href="http://something-different.s3.amazonaws.com/' + fileKeys[i].childNodes[0].nodeValue + '">+ ' + fileKeys[i].childNodes[0].nodeValue + '<br><br>');
              }
            }

          }

    });
  })
}

//Validates login token and runs callback function.
function validateAndRun(callback) {

  var tokendata = {'token': readCookie('token')};   
  //$("#debug-div").append(logindata.username + " " + logindata.password + "<br>");

  //Make API call to validate token (test)
  $.ajax( 
      {
        method: "POST",
        url: API + "validate-token",
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
          logout();

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
          url: API + "login",
          dataType: "json",
          data: JSON.stringify(formdata),
          crossdomain: true,
          async:true, 
          success: function(data) {
            console.log("SUCCESS " + JSON.stringify(data) + "\n");

            login(formdata['username'], data.token);

            window.location.hash = "#home.html";
          },
          error: function(data) {
            console.log("ERROR " + JSON.stringify(data));
            $("#login-error").html(data.responseText + "<br>");
            logout();
          }

        }
      );

      
  });

  $('#login-form input').keydown(function(e) {
    if (e.keyCode == 13) {
        $("#login-form-submit").click();
    }
  });
};

function login(username, token) {
  createCookie('token', token, 1);
  createCookie('username', username, 1);
  $(".secure-nav").show();
  $("#navLogin").hide();
  $("#navRegister").hide();
}

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
          url: API + "register-user",
          dataType: "json",
          data: JSON.stringify(formdata),
          crossdomain:true,
          async:true, 
          success: function(data) {
            console.log("SUCCESS" + JSON.stringify(data));
            // If you want to login right after registering, such as when you don't need users to be validated, use this.
            /*
            $.ajax( 
              {
                method: "POST",
                url: API + "login",
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
            );*/
            window.location.hash = "#login.html";
          },
          error: function(data) {
            console.log("ERROR" + JSON.stringify(data));
          }

        }
      );

    }
  });
  $('#register-form input').keydown(function(e) {
    if (e.keyCode == 13) {
        $("#register-form-submit").click();
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

//Used for sorting function for replies.  Compares two time values (oldest first)
function compareTimesAsc(a,b) {
  if (a.Time < b.Time)
    return -1;
  if (a.Time > b.Time)
    return 1;
  return 0;
}