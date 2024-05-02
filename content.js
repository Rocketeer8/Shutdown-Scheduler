function updateTimeFields() {
    chrome.runtime.sendMessage({ action: "getTime"}, (response) => {
        if (response) {
          const sd_hours = document.getElementById("hours")
          const sd_minutes = document.getElementById("minutes")
          const ro_hours = document.getElementById("rhours")
          const ro_minutes = document.getElementById("rminutes")

          sd_hours.value = (response.shutdownHour == 0 ? "00" : response.shutdownHour)
          sd_minutes.value = (response.shutdownMinute < 10 ? "0" + response.shutdownMinute : response.shutdownMinute)
          ro_hours.value = (response.reopenHour == 0 ? "00" : response.reopenHour)
          ro_minutes.value = (response.reopenMinute < 10 ? "0" + response.reopenMinute : response.reopenMinute)

        }
    });
}

function updateCountdown() {
    // Get the current time and midnight time
    let currentTime = new Date();
    
    let shutdownTime = new Date();
    // shutdownTime.setHours(24, 0, 0, 0); // Set the time to shutdownTime

    chrome.runtime.sendMessage({ action: "getTime" }, (response) => {
        if (response) {
            // Set the time to shutdownTime
            // console.log(response.shutdownHour + " " + response.shutdownMinute)
            shutdownTime.setHours(response.shutdownHour, response.shutdownMinute, 0, 0);
            
            // set shutdown time
            let shutdownTimeElement = document.getElementById('shutdownTime');
            
            if (shutdownTimeElement) {
                shutdownTimeElement.textContent = 'alarm set at: ' + 
                (response.shutdownHour == 0 ? "00" : response.shutdownHour) + ":" + 
                (response.shutdownMinute < 10 ? "0" + response.shutdownMinute : response.shutdownMinute) + ", " +
                'reopen at: ' + 
                (response.reopenHour == 0 ? "00" : response.reopenHour) + ":" + 
                (response.reopenMinute < 10 ? "0" + response.reopenMinute : response.reopenMinute)
            }

            if (currentTime.getTime() > shutdownTime.getTime()) {
                // If current time is greater than shutdown time, set shutdown time for the next day
                shutdownTime.setDate(shutdownTime.getDate() + 1);
            }

            // Calculate the time difference between current time and shutdownTime
            let timeDifference = shutdownTime.getTime() - currentTime.getTime();

            // Calculate hours, minutes, and seconds from the time difference
            let hours = Math.floor(timeDifference / (1000 * 60 * 60));
            let minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            // Format the countdown time
            let formattedTime = hours + 'h ' + minutes + 'm ' + seconds + 's';

            // Display the countdown timer in the popup
            let countdownElement = document.getElementById('countdown');
            if (countdownElement) {
                countdownElement.textContent = 'Time until shutdown time: ' + formattedTime;
            }
        }
    });
}

async function sendMessageAndWait(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  async function handleButtonClick(buttonID) {
    var typedMessage = window.prompt('Type "I understand the consequences of my action by changing the shutdown time."');

    if (typedMessage === 'I understand the consequences of my action by changing the shutdown time.') {
        window.alert('Message received!');

        // Get the values of hours and minutes from input fields
        let hoursInput
        let minutesInput
        if (buttonID === 'setTimeButton') {
            hoursInput = document.getElementById('hours');
            minutesInput = document.getElementById('minutes');
        } else  {
            hoursInput = document.getElementById('rhours');
            minutesInput = document.getElementById('rminutes');
        }
        const hours = parseInt(hoursInput.value);
        const minutes = parseInt(minutesInput.value);

        // Validate input: hours should be between 0 and 23, minutes between 0 and 59
        if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59) {
            alert('Invalid input. Please enter valid hours (0-23) and minutes (0-59).');
            return;
        }
        if (hoursInput.value.length === 1) { hoursInput.value = '0' + hoursInput.value }
        if (minutesInput.value.length === 1) { minutesInput.value = '0' + minutesInput.value }
        
        // we want to make sure the shutdown time is set before moving to the next line
        if (buttonID === 'setTimeButton') {
            await sendMessageAndWait({action: "setShutdownTime", hoursValue: hours, minutesValue: minutes})
        } else {
            await sendMessageAndWait({action: "setReopenTime", hoursValue: hours, minutesValue: minutes})
        }

    } else {
        window.alert('Invalid message. Please try again.');
    }
  }

// Update the countdown timer every second
setInterval(updateCountdown, 1000);

document.addEventListener('DOMContentLoaded', function() {

    // Initial call to update the countdown immediately
    const setTimeButtonSD = document.getElementById('setTimeButton');
    const setTimeButtonRO = document.getElementById('setReopenTimeButton');


    setTimeButtonSD.addEventListener('click', function(event) {
        handleButtonClick(event.target.id);
      });
      
      setTimeButtonRO.addEventListener('click', function(event) {
        handleButtonClick(event.target.id);
      });

    /*
    // Add click event listener to the button
    setTimeButton.addEventListener('click', async function() {
        
        var typedMessage = window.prompt('Type "I understand the consequences of my action by changing the shutdown time."');

        if (typedMessage === 'I understand the consequences of my action by changing the shutdown time.') {
            window.alert('Message received!');
            // Get the values of hours and minutes from input fields
            const hoursInput = document.getElementById('hours');
            const minutesInput = document.getElementById('minutes');
            const hours = parseInt(hoursInput.value);
            const minutes = parseInt(minutesInput.value);

            // Validate input: hours should be between 0 and 23, minutes between 0 and 59
            if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59) {
                alert('Invalid input. Please enter valid hours (0-23) and minutes (0-59).');
                return;
            }
            if (hoursInput.value.length === 1) { hoursInput.value = '0' + hoursInput.value }
            if (minutesInput.value.length === 1) { minutesInput.value = '0' + minutesInput.value }
            
            // we want to make sure the shutdown time is set before moving to the next line
            await sendMessageAndWait({action: "setShutdownTime", hoursValue: hours, minutesValue: minutes})
            // chrome.runtime.sendMessage({action: "setShutdownTime", hoursValue: hours, minutesValue: minutes}, (response) => {});

        } else {
            window.alert('Invalid message. Please try again.');
        }
    
    });
    */

    updateTimeFields();
    updateCountdown();
});

chrome.tabs.onCreated.addListener((tab) => {
    // Show an alert when a new tab is opened
    alert('Welcome to the new tab!');
  });