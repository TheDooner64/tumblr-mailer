// Load the fs module so we can read files from the computer
var fs = require("fs");

// Load ejs to use the template engine
  // Returns an object with all of the ejs methods
  // ejs has a method called render that creates a new template with ejs
  // The render function takes a template and an object filled with properties that are used in the template
  // After an EJS is processed, it will return pure HTML that is ready to be sent in an email
var ejs = require("ejs");

// Require the api-keys file we created
var apiKeys = require("./api-keys.js");

// Store the contents of the "friend_list.csv" and "email-template.html" files as strings of text
  // Note: Most modern browsers use UTF-8 to encode text
var csvFile = fs.readFileSync("friend_list.csv","utf8");
var emailTemplate = fs.readFileSync("email-template.ejs","utf8");

// Define a function to parse the CSV file
function csvParse(file) {
  var objArray = [];
  var contactObj;
  var contactArray = file.split("\n");

  // Create an array of the header keys
  var headerKeys = contactArray.shift().split(",");

  // For each contact in the array, run a function that creates and pushes an object of the contact
  contactArray.forEach(function(contact) {
    contact = contact.split(",");
    contactObj = {};

    // Loop through the elements of each contact and match the keys to their values
    for (var i = 0; i < contact.length; i++) {
      contactObj[headerKeys[i]] = contact[i];
    }

    objArray.push(contactObj);
  });

  return objArray;
}

var contactList = csvParse(csvFile);

// Make an api request to tumblr to retrieve blog post data to be used in e-mail generation
apiKeys.client.posts("thedooner64", function (err, blog) {
  var blogPosts = blog.posts;
  var latestPosts = [];
  var todayDate = new Date();

  // Loop through all blog posts and push posts within last 2 months to the latestPosts array
  for (var i = 0; i < blogPosts.length; i++) {
    var cleanDate = blogPosts[i].date.split(" ")[0].split("-"); // Isolate the year-month-day portion of the date
    var cleanerDate = new Date(cleanDate[0], cleanDate[1], cleanDate[2]); // Convert the date array to an actual date value
    // Compare the date to today's date, and convert the difference from milliseconds to # days
    var difference = (todayDate - cleanerDate) / 86400000;
    
    if (difference < 60) {
      latestPosts.push(blogPosts[i]);
    }
  }
  
  // Loop through each contact and insert their details into an email template with ejs
  contactList.forEach(function(contact) {
    var myName = "Bobby Muldoon";
    var myEmail = "Robert.Muldoon.1@gmail.com";
    var firstName = contact["firstName"];
    var lastName = contact["lastName"];
    var numMonthsSinceContact = contact["numMonthsSinceContact"];
    var emailAddress = contact["emailAddress"];
    var subject = "Keeping in touch";
    // Render the template using ejs, and pass in the relevant elements
    var customizedTemplate = ejs.render(emailTemplate,
                                        { firstName: firstName,
                                          numMonthsSinceContact: numMonthsSinceContact,
                                          latestPosts: latestPosts
                                        });
    sendEmail(firstName + " " + lastName, emailAddress, myName, myEmail, subject, customizedTemplate);
  });

  function sendEmail(to_name, to_email, from_name, from_email, subject, message_html){
    var message = {
      "html": message_html,
      "subject": subject,
      "from_email": from_email,
      "from_name": from_name,
      "to": [{
        "email": to_email,
        "name": to_name
      }],
      "important": false,
      "track_opens": true,
      "auto_html": false,
      "preserve_recipients": true,
      "merge": false,
      "tags": [
        "Fullstack_Tumblrmailer_Workshop"
      ]
    };
    var async = false;
    var ip_pool = "Main Pool";
    apiKeys.mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool}, function(result) {
      console.log(result);
    }, function(e) {
      // Mandrill returns the error as an object with name and message keys
      console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
      // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
    });
  }
});