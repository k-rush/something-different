
function onLoadHome() {
  //debugger;
  //initial build meetings table
  buildMeetingsTable('day');
};

function buildMeetingsTable(sortField) {
  $("#home-meetings").html(''); //clear what's there.
  var days = {'0':'Sunday','1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday'};
  var html = "";
  var sortFunction = {'time': sortMeetingsByTime, 'day':sortMeetingsByDay, 'name':sortMeetingsByName};
  var headerName = {'time':'#time-header', 'day':'#day-header', 'name':'#name-header'};
  /** Get the meetings data into array, format it to display.
    * NOTE: meetings file is downloaded from a cronjob from the area 72 website. */
  $.getJSON('meetings', function( data ) {
    var filteredData = $(data).filter(function(i,n) {return n.notes === "District 40"});

    //console.log(filteredData);
    //console.log(filteredData.sort(sortMeetingsByTime));
    html += '<table class="table"><thead><tr><th class="sort-header" id="name-header">Meeting</th><th id="location-header">Location</th><th class="sort-header" id="time-header">Time</th><th class="sort-header" id="day-header">Day</th></thead><tbody>';
    //Building the meetings list
    filteredData = filteredData.sort(sortFunction[sortField]); //sort based on function we're building.
    filteredData = Array.from(filteredData); //create array so we can iterate with forEach.
    filteredData.forEach(function(element, i) {
          html += "<tr><td>" + element['name'] + "</td><td>" +  element['location'] + "<br>" + element['formatted_address'] + "</td><td>" + element['time_formatted'] +  "</td><td>" + days[element['day']] + "</td></tr>";
      }); //Builds the table rows by iterating through filteredData array
    html += "</tbody></table>";
    $("#home-meetings").append(html);
    $("#home-meetings-loading").hide();

    /* Changes table header that's currently being sorted to bold, the rest to normal. */
    $(".sort-header").css("font-weight", "normal");
    $(".sort-header").hover(function() {
        $(this).css('cursor','pointer');
    });
    $(headerName[sortField]).css("font-weight", "bold");

    /* Bind sorting click events to the table headers.  Will rebuild table. */
    $("#name-header").on("click", function(event) {
      buildMeetingsTable('name');
      event.stopPropogation();
    });
    $("#day-header").bind("click", function(event) {
      buildMeetingsTable('day');
      $("#day-header").css("font-weight", "bold");
      event.stopPropogation();
    });

    $("#time-header").bind("click", function(event) {
      buildMeetingsTable('time');
      $("#day-header").css("font-weight", "bold");
      event.stopPropogation();
    });

  });
};

/** Sorts by day, then time, then name. */
function sortMeetingsByDay(a,b) {
  if(a['day'] < b['day']) {
    return -1;
  }
  else if (a['day'] > b['day']) {
    return 1;
  }
  else if(a['time'] < b['time']) {
    return -1;
  }
  else if (a['time'] > b['time']) {
    return 1;
  }
  else if(a['name'].toLowerCase() < b['name'].toLowerCase()) {
    return -1;
  }
  else if (a['name'].toLowerCase() > b['name'].toLowerCase()) {
    return 1;
  }
};

/** Sorts by name, then day, then time. */
function sortMeetingsByName(a,b) {
  if(a['name'].toLowerCase() < b['name'].toLowerCase()) {
    return -1;
  }
  else if (a['name'].toLowerCase() > b['name'].toLowerCase()) {
    return 1;
  }
  else if(a['day'] < b['day']) {
    return -1;
  }
  else if (a['day'] > b['day']) {
    return 1;
  }
  else if(a['time'] < b['time']) {
    return -1;
  }
  else if (a['time'] > b['time']) {
    return 1;
  }
  
};

/** Sorts by time then day then name. */
function sortMeetingsByTime(a,b) {

  if(a['time'] < b['time']) {
    return -1;
  }
  else if (a['time'] > b['time']) {
    return 1;
  }
  else if(a['day'] < b['day']) {
    return -1;
  }
  else if (a['day'] > b['day']) {
    return 1;
  }
  else if(a['name'].toLowerCase() < b['name'].toLowerCase()) {
    return -1;
  }
  else if (a['name'].toLowerCase() > b['name'].toLowerCase()) {
    return 1;
  }
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
          });

        });

      }
      /** boldify nav links */
      $(".update-content").css("font-weight","normal");
      if (url == "home.html")  $("#navDiscussion").css("font-weight","bold");
      else if (url == "events.html")  $("#navEvents").css("font-weight","bold");
      else if (url == "contact.html")  $("#navContact").css("font-weight","bold");
    });


    $(window).hashchange();

});