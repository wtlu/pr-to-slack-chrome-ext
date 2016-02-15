var SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/your/own/webhookurl'; // Change this to your own slack webhook

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });
}

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

function sendToSlack(data) {

  // Grab the data from inside the forms
  var name = document.forms[0].elements[0].value;
  var task = document.forms[0].elements[1].value;
  var ert = document.forms[0].elements[2].value + " min";
  var reviewer = document.forms[0].elements[3].value;
  var link = document.forms[0].elements[4].value;
  var msg = document.forms[0].elements[5].value;

  // Save the data first
  // Save it using the Chrome extension storage API.
  chrome.storage.sync.set({'stashName': name}, function() {
    // Notify that we saved.
  });

  var x = new XMLHttpRequest();
  x.open('POST', SLACK_WEBHOOK_URL);


  var title = "PULL REQUEST";
  var resultText = `Task: ${task}
Estimated Review Time: ${ert}
Reviewer: ${reviewer}
Link: ${link}`;

  // Slack API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function(result) {
    // Parse and process the response from Google Image Search.
    var status = x.status;
    if (status !== 200) {
      renderStatus('Error from Slack. Status code: ' + status + ', Message: '+ x.statusText);
      return;
    }
  };
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send(JSON.stringify({
    "attachments": [
        {
            "fallback": "Pull Request",

            "color": "#36a64f",

            "pretext": `New Pull Request from ${name}!`,

            "author_name": name,
            "author_icon": "",

            "title": title,
            "title_link": link,

            "text": msg,

            "fields": [
                {
                    "title": "Task",
                    "value": task,
                    "short": false
                },
                {
                    "title": "Reviewers",
                    "value": reviewer,
                    "short": true
                },
                {
                    "title": "Review Time",
                    "value": ert,
                    "short": true
                }
            ]
        }
    ]
  }));
}

document.addEventListener('DOMContentLoaded', function () {
  var submitBtn = document.querySelector('#submit');
  submitBtn.addEventListener('click', sendToSlack);
});

// Need to get the URL in the beginning of popup load
document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(url) {

    document.forms[0].elements[4].value = url;

  });

  chrome.storage.sync.get('stashName', function(item) {

    if (item.stashName) {
      document.forms[0].elements[0].value = item.stashName;
    }

  });
});
