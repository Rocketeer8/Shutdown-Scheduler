// set value in user's local storage that last the lifetime of browser
function setData(data, callback) { 
  // data is an object with key and value pair(s)
  chrome.storage.local.set(data, function() {
      if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          callback("Set data fail!"); // Call the callback with false to indicate an error
          // Handle error if storage operation fails
      } else {
          // Handle success
          callback("Set data success!"); // Call the callback with true to indicate success
      }
  });
}

// callback function ensure the value is available when the callback is exectued
function getData(keys, callback) {
  // keys is a list
  chrome.storage.local.get(keys, function(resultObj) {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving data: " + chrome.runtime.lastError.message);
        callback(undefined); // Call the callback with undefined to indicate an error
      } else {
        console.log("Value of 'key': " + resultObj[keys[0]]);
        callback(resultObj); // Call the callback with the retrieved value
      }
  });
}

// Function to shut off all windows
function shutOffAllWindows() {
    chrome.windows.getAll({ populate: true }, function(windows) {
      windows.forEach(function(window) {
        chrome.windows.remove(window.id);
      });
    });
  }
  
  // Function to handle the alarm
  function handleAlarm(alarm) {
    if (alarm.name === 'shutdownAlarm') {
      // Shut off all windows when the alarm triggers at 12 AM
      var triggerTime = new Date(alarm.scheduledTime);
      // Log the triggered time in a human-readable format
      console.log('Alarm triggered at:', triggerTime.toLocaleString());
      shutOffAllWindows();
    }
  }
  
  // Function to calculate the shutdown time
  function getTimestamp() {
    return new Promise((resolve, reject) => {  // need to use promise because need to wait for getData to finish before returning final timestamp

      let shutdownTime = new Date();
      var currentTime = new Date(); // Get the current date and time
      
      getData(['shutdownHour', "shutdownMinute"], function(resultObj) {
        shutdownTime.setHours(resultObj['shutdownHour'], resultObj['shutdownMinute'], 0, 0); // Set time to midnight (hour, minute, 0, 0)
        if (currentTime.getTime() > shutdownTime.getTime()) {
          // If current time is greater than shutdown time, set shutdown time for the next day
          shutdownTime.setDate(shutdownTime.getDate() + 1);
        }
        console.log("Got new shutdown time: " + shutdownTime.toString());
        resolve(shutdownTime.getTime()); // promise resolved, Return timestamp of midnight
      });
    });
  }
  
  function updateAlarmTrigger() {
    // creating alarm of same name will replace the existing alarm
    // timestamp comes from resolve(shutdownTime.getTime()); in getTimestamp()
      getTimestamp().then((timestamp) => {
        chrome.alarms.create('shutdownAlarm', {
          when: timestamp
        });
      }) // get shutdown time
  }

  function openBrowserListener() {

    var now = new Date();
    var shutdownTime = new Date();
    var reopenTime = new Date();

    getData(['shutdownHour', "shutdownMinute", 'reopenHour', "reopenMinute"], function(resultObj) {
      shutdownTime.setHours(resultObj['shutdownHour'])
      shutdownTime.setMinutes(resultObj['shutdownMinute'])
      reopenTime.setHours(resultObj['reopenHour'])
      reopenTime.setMinutes(resultObj['reopenMinute'])
      console.log("Got STTTT: " + shutdownTime.toString());
      console.log("Got REOP: " + reopenTime.toString());

      // If the shutdownTime time is later than reopen time, that mean a new shutdown is set for the next day
      // in that case minus 1 day from shutdownTime to see if current time is in between shutdown interval
      if (reopenTime < shutdownTime) {
        shutdownTime.setDate(reopenTime.getDate() - 1);
      }

      if (now >= shutdownTime && now < reopenTime) {
        // Shut off all windows if the current time is between shutdownTime and reopenTime
        shutOffAllWindows();
      }
    });
  }
   

  function messageListener() {
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      
      if (message.action === "getShutdownTime") { // listen to request from content.js to get max tab number field value
        // Respond with the current value of the number field
        getData(['shutdownHour', 'shutdownMinute'], function(resultObj) {
            sendResponse({ shutdownHour: resultObj['shutdownHour'], shutdownMinute: resultObj['shutdownMinute']});
        })
      } else if(message.action === "getReopenTime") {
        getData(['reopenHour', 'reopenMinute'], function(resultObj) {
          sendResponse({ reopenHour: resultObj['reopenHour'], reopenMinute: resultObj['reopenMinute']});
        })
      } else if (message.action === "getTime") {
        getData(['shutdownHour', 'shutdownMinute', 'reopenHour', 'reopenMinute'], function(resultObj) {
          sendResponse({shutdownHour: resultObj['shutdownHour'], shutdownMinute: resultObj['shutdownMinute'], 
            reopenHour: resultObj['reopenHour'], reopenMinute: resultObj['reopenMinute']});
        })
      } else if (message.action === "setShutdownTime") {
        console.log("YOOOOOOOOOOOOO " + message.hoursValue + " " + message.minutesValue)
        setData({"shutdownHour": message.hoursValue, "shutdownMinute": message.minutesValue}, (msg) => console.log(msg));
        updateAlarmTrigger()
      } else if (message.action === "setReopenTime") {
        setData({"reopenHour": message.hoursValue, "reopenMinute": message.minutesValue}, (msg) => console.log(msg));
        updateAlarmTrigger()
      }
      return true;
    });
  }

  function initialize() {
      // set initial shut down time to midnight
      getData(['shutdownHour', "shutdownMinute"], function(resultObj) {
        if (resultObj['shutdownHour'] === undefined || resultObj['shutdownMinute'] === undefined) {
            setData({"shutdownHour": 0, "shutdownMinute": 0}, (msg) => console.log(msg));
        }
      })
      getData(['reopenHour', "reopenMinute"], function(resultObj) {
        if (resultObj['reopenHour'] === undefined || resultObj['reopenMinute'] === undefined) {
          console.log("Setting open hour and minute")
            setData({"reopenHour": 5, "reopenMinute": 0}, (msg) => console.log(msg));
        }
      })
    
      updateAlarmTrigger() // create or update shutdown alarm
    
      chrome.alarms.onAlarm.addListener(handleAlarm);  // Add listener for alarm

      openBrowserListener() // add listener when a new broswer open and check if it's within shutdown period

      messageListener(); // add listener for receive message from content.js
  }


  initialize()
  
  // add the following or the service worker will be inactive when start
  // Event listener to register the service worker when the extension is installed or updated
  chrome.runtime.onInstalled.addListener(details => {
    console.log('Extension installed or updated:', details);
    initialize()
  });
  
  // Event listener to register the service worker when the extension is started
  chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
    initialize()
  });

  