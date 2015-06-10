 // DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded

window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var urlSuccess = 'https://api.imgur.com/'; //example.com has no CORS support
  var urlFail = 'www.test-cors.org/fail'; // Returns a 404, which gets logged as a failure by the API we are testing
  if (navigator.userAgent.indexOf("(Mobile") > -1) { // If this is on FXOS device
    urlSuccess = 'http://www.example.com'; // Returns a 404, which gets logged as a failure by the API we are testing
    urlFail = 'http://www.test-cors.org/fail'; // Returns a 404, which gets logged as a failure by the API we are testing
  }

  var requestWith = null;
  var requestWithout = null;
  var timeoutWith = null;
  var timeoutWithout = null;
  var firstInterrupt = null;
  var n = 5;
  var wave = null;

  var attemptsWith = 0;
  var attemptsWithout = 0;
  var successesWith = 0;
  var successesWithout = 0;
  var dataWith = 0;
  var dataWithout = 0;
  var batUsageWith = {base: 0, diff: 0};
  var batUsageWithout = {base: 0, diff: 0};
  var memUsageWith = {base: 0, diff: 0, max: 0};
  var memUsageWithout = {base: 0, diff: 0, max: 0};
  var latUsageWith = {avg: 0, levels: []};
  var latUsageWithout = {avg: 0, levels: []};
  var latStart = null;
  var startTime = 0;

  var nTimeout = 1000;
  var level = 2;
  var r = null;

  var translate = navigator.mozL10n.get;

  // Table Elements
  var benchmarkLevel = document.getElementById('benchmarkLevel');
  var progressBar = document.getElementById('progress');
  var netStatus = document.getElementById('netStatus');
  var intStatus = document.getElementById('intStatus');
  var rateWithout = document.getElementById('sucWithout');
  var rateWith = document.getElementById('sucWith');
  var atmWithout = document.getElementById('attemptsWithout');
  var atmWith = document.getElementById('attemptsWith');
  var sucWithout = document.getElementById('successesWithout');
  var sucWith = document.getElementById('successesWith');
  var batWithout = document.getElementById('batWithout');
  var batWith = document.getElementById('batWith');
  var memWithout = document.getElementById('memWithout');
  var memWith = document.getElementById('memWith');
  var dWithout = document.getElementById('dataWithout');
  var dWith = document.getElementById('dataWith');
  var latWithout = document.getElementById('latWithout');
  var latWith = document.getElementById('latWith');

  var fxosutest = document.getElementById('fxosutest');
  fxosutest.addEventListener('click', function(e) {
    fxosuTest();
  }, false);

  var runbenchmark = document.getElementById('runbenchmark');
  runbenchmark.addEventListener('click', function(e) {
    runBenchmark();
  }, false);


  function fxosuTest() {

    if ('mozFxOSUService' in navigator) {
      var fxosu = navigator.mozFxOSUService;
      var linkType = "";
      switch (fxosu.connectionType()) {
        case 0:
          linkType = "Unknown";
          break;
        case 1:
          linkType = "Ethernet";
          break;
        case 2:
          linkType = "USB";
          break;
        case 3:
          linkType = "WiFi";
          break;
        case 4:
          linkType = "WiMax";
          break;
        case 5:
          linkType = "2G";
          break;
        case 6:
          linkType = "3G";
          break;
        case 7:
          linkType = "4G";
          break;
        default:
          linkType = "Unknown";
          break;
      }
      var netlat = fxosu.latencyInfo();
      var sucRate = fxosu.successRate();
      var mozSucRate = fxosu.successRate(2000);
      var batLevel = fxosu.batteryLevel();
      var batCha = fxosu.batteryCharging();
      document.getElementById('batlevel').innerHTML = batLevel * 100 + "%";
      document.getElementById('batcharge').innerHTML = (batCha === true ? 'Yes' : 'No');
      if (batLevel == 1.0 && !batCha) {
        document.getElementById('batcharge').innerHTML += " (battery is 100%, so might be charging)";
      }
      document.getElementById('connected').innerHTML = "Unknown"; //(fxosu.connectionUp() === true ? 'Yes' : 'No');
      document.getElementById('latency').innerHTML = netlat.networkLatency;
      document.getElementById('ctype').innerHTML = linkType;
      document.getElementById('recbytes').innerHTML = fxosu.receivedBytes();
      document.getElementById('cstable').innerHTML = (fxosu.isConnectionStable() === true ? 'Yes' : 'No');
      document.getElementById('successrate').innerHTML = (sucRate.rate * 100).toFixed(2) + "% (" + sucRate.successes + "/" + sucRate.attempted + ")";
      document.getElementById('high').innerHTML = (fxosu.mozIsNowGood(1) === true ? 'Go' : 'No-Go');
      document.getElementById('mod').innerHTML = (fxosu.mozIsNowGood(2) === true ? 'Go' : 'No-Go');
      document.getElementById('low').innerHTML = (fxosu.mozIsNowGood(3) === true ? 'Go' : 'No-Go');
      document.getElementById('mozbatlevel').innerHTML = batLevel * 100 + "%";
      document.getElementById('mozbatcharge').innerHTML = (batCha === true ? 'Yes' : 'No');
      document.getElementById('mozcstable').innerHTML = (fxosu.isConnectionStable(2000) === true ? 'Yes' : 'No');
      document.getElementById('mozsuccessrate').innerHTML = (mozSucRate.rate * 100).toFixed(2) + "% (" + mozSucRate.successes + "/" + mozSucRate.attempted + ")";
    } else {
      console.log("mozFxOSUService does not exist");
    }

  }


  function getInterrupt() {
    var ms = wave * 2;

    // Set starting times
    if (atmWithout === 1 || atmWith === 1) {
      startTime = (new Date()).getTime();
    }

    // Determine number based on startTime, to ensure we start at 0
    var num = ((new Date()).getTime() - startTime) % ms;

    if (num > wave) {
      netStatus.innerHTML = "Unstable";
      return true;
    } else {
      netStatus.innerHTML = "Stable";
      return false;
    }
  }


  function runBenchmark() {
    wave = parseInt(Math.random() * 5000); // Makes a random network change of 0 to 5 seconds
    resetLabels();
    resetCounters();
    intStatus.innerHTML = wave + " ms waves";

    switch (benchmarkLevel.value) {
      case "1 - High":
        level = 1;
        break;
      case "2 - Moderate":
        level = 2;
        break;
      case "3 - Low":
        level = 3;
        break;
      default:
        level = 2;
        break;
    }

    // Just call without, once it finishes its' 30 requests, onRequestLoad will handle starting sendRequestWith()
    sendRequestWithout();

  }


  function _sendFail () {
    // mozSystem option required to prevent CORS errors (Cross Origin Resource Sharing)
    var r = new XMLHttpRequest({ mozSystem: true });
    r.responseType = 'document';

    r.addEventListener('load', function () {
      alert(r.status);
    });

    r.open('get', urlFail + '?_=' + (new Date()).getTime(), true); // Appending a rand to tail of url, ensures no caching
    r.send();
    //console.log("Did the thing!");
  }


  function sendRequestWithout() {
    if (attemptsWithout === 0) {
      batUsageWithout.base = navigator.mozFxOSUService.batteryLevel();
      memUsageWithout.base = navigator.mozFxOSUService.memoryManager().resident;
      memUsageWithout.max = memUsageWithout.base;
    }
    attemptsWithout += 1;
    latStart = (new Date()).getTime(); // A single global works because requests don't happen concurrently

    // mozSystem option required to prevent CORS errors (Cross Origin Resource Sharing)
    requestWithout = new XMLHttpRequest({ mozSystem: true });
    requestWithout.responseType = 'document';

    // We're setting some handlers here for dealing with both error and data received.
    requestWithout.addEventListener('error', function () {
      onRequestError(sendRequestWithout);
    });
    requestWithout.addEventListener('load', function () {
      onRequestLoad(sendRequestWithout);
    });

    // Determine if we should simulate a network interruption
    if (!getInterrupt()) { // success
      requestWithout.open('get', urlSuccess + '?_=' + (new Date()).getTime(), true); // Appending a rand to tail of url, ensures no caching
      requestWithout.send();
      //console.log("Without: Sent SUCCESS request (#" + attemptsWithout + ")");
    } else { // fail
      requestWithout.open('get', urlFail + '?_=' + (new Date()).getTime(), true); // Appending a rand to tail of url, ensures no caching
      requestWithout.send();
      //console.log("Without: Sent FAIL request (#" + attemptsWithout + ")");
    }

    // Set a timeout to keep from freezing
    timeoutWithout = setTimeout(function(){ timeoutCalled(sendRequestWithout); }, nTimeout);
  }


  function sendRequestWith() {
    if (attemptsWith === 0) {
      batUsageWith.base = navigator.mozFxOSUService.batteryLevel();
      memUsageWith.base = navigator.mozFxOSUService.memoryManager().resident;
      memUsageWith.max = memUsageWith.base;
    }
    var s = (new Date()).getTime();
    var goNogo = navigator.mozFxOSUService.mozIsNowGood(level);
    // If on Fennec, use timeout - hacky fix for cross-platform compatibility
    if (navigator.userAgent.indexOf("(Android; Mobile")) {
      goNogo = true;
    }

    while (1) {

      if (goNogo) {
        attemptsWith += 1;
        latStart = (new Date()).getTime(); // A single global works because requests don't happen concurrently

        // mozSystem option required to prevent CORS errors (Cross Origin Resource Sharing)
        requestWith = new XMLHttpRequest({ mozSystem: true });
        requestWith.responseType = 'document';

        // We're setting some handlers here for dealing with both error and data received.
        requestWith.addEventListener('error', function () {
          onRequestError(sendRequestWith);
        });
        requestWith.addEventListener('load', function () {
          onRequestLoad(sendRequestWith);
        });

        // Determine if we should simulate a network interruption
        if (!getInterrupt()) { // success
          requestWith.open('get', urlSuccess + '?_=' + (new Date()).getTime(), true); // Appending a rand to tail of url, ensures no caching
          requestWith.send();
          //console.log("With: Sent SUCCESS request (#" + attemptsWith + ")");
        } else { // fail
          requestWith.open('get', urlFail + '?_=' + (new Date()).getTime(), true); // Appending a rand to tail of url, ensures no caching
          requestWith.send();
          //console.log("With: Sent FAIL request (#" + attemptsWith + ")");
        }

        // You did your thang, now leave
        break;
      }
    }

    // Set a timeout to keep from freezing
    timeoutWith = setTimeout(function(){ timeoutCalled(sendRequestWith); }, nTimeout);
  }


  function onRequestError(func) {

    if (func === sendRequestWithout) {
      showError(requestWithout.responseURL);
    } else if (func === sendRequestWith) {
      showError(requestWith.responseURL);
    }

  }


  function onRequestLoad(func) {
    var contentLen = null;
    var statusCode = null;

    // Update table
    atmWithout.innerHTML = attemptsWithout;
    atmWith.innerHTML = attemptsWith;

    if (func === sendRequestWithout) {
      contentLen = requestWithout.getResponseHeader("Content-Length");
      contentLen = (isNaN(contentLen)) ? 0 : contentLen;
      statusCode = requestWithout.status;
      clearTimeout(timeoutWithout);
      dataWithout += parseInt(contentLen);

      // Check levels
      var tempMem = navigator.mozFxOSUService.memoryManager();
      if (tempMem.resident > memUsageWithout.max) {
        memUsageWithout.max = tempMem.resident;
        memUsageWithout.diff = memUsageWithout.max - memUsageWithout.base;
      }
      latUsageWithout.levels.push((new Date()).getTime() - latStart);

      // Check status of reply
      if (statusCode !== 200) { // If fail, retry
        //console.log("Without: Response #" + attemptsWithout + " FAILED with " + statusCode);
        sendRequestWithout();
      } else if (statusCode === 0) {
        //console.log("Without: Response #" + attemptsWithout + " ERROR of come kind");
        sendRequestWithout();
      } else { // If success, let next request happen
        successesWithout += 1;
        sucWithout.innerHTML = successesWithout;
        //console.log("Without: Response #" + attemptsWithout + " SUCCEEDED");
        if (successesWithout < n) {
          sendRequestWithout();
        } else {
          setWithoutData();

          // sendRequestWithout() has finished its' 30 requests, now start sendRequestWith()
          sendRequestWith();
        }
      }
    } else if (func === sendRequestWith) {
      contentLen = requestWith.getResponseHeader("Content-Length");
      contentLen = (isNaN(contentLen)) ? 0 : contentLen;
      statusCode = requestWith.status;
      clearTimeout(timeoutWith);
      dataWith += parseInt(contentLen);

      // Check levels
      var tempMem = navigator.mozFxOSUService.memoryManager();
      if (tempMem.resident > memUsageWith.max) {
        memUsageWith.max = tempMem.resident;
        memUsageWith.diff = memUsageWith.max - memUsageWith.base;
      }
      latUsageWith.levels.push((new Date()).getTime() - latStart);

      // Check status of reply
      if (statusCode !== 200) { // If fail, retry
        //console.log("With: Response #" + attemptsWith + " FAILED with " + statusCode);
        sendRequestWith();
      } else if (statusCode === 0) {
        //console.log("With: Response #" + attemptsWith + " ERROR of come kind");
        sendRequestWith();
      } else { // If success, let next request happen
        successesWith += 1;
        sucWith.innerHTML = successesWith;
        //console.log("With: Response #" + attemptsWith + " SUCCEEDED");
        if (successesWith < n) {
          sendRequestWith();
        } else {
          setWithData();
        }
      }
    }
    
    var pro = ((successesWithout + successesWith) / (n * 2)) * 100;
    progressBar.setAttributeNS(null, 'value', pro);
  }


  function setWithoutData() {
    rateWithout.innerHTML = ((n / attemptsWithout) * 100).toFixed(2) + "% (" + 
                                                      n + "/" + attemptsWithout + ")";
    dWithout.innerHTML = bytesToString(dataWithout);
    batUsageWithout.diff = batUsageWithout.base - navigator.mozFxOSUService.batteryLevel();
    batWithout.innerHTML = batUsageWithout.diff + "%";
    memWithout.innerHTML = bytesToString(memUsageWithout.diff);
    latUsageWithout.avg = avg(latUsageWithout.levels);
    latWithout.innerHTML = latUsageWithout.avg + "ms";
  }


  function setWithData() {
    rateWith.innerHTML = ((n / attemptsWith) * 100).toFixed(2) + "% (" + 
                                                      n + "/" + attemptsWith + ")";
    dWith.innerHTML = bytesToString(dataWith);
    batUsageWith.diff = batUsageWith.base - navigator.mozFxOSUService.batteryLevel();
    batWith.innerHTML = batUsageWith.diff + "%";
    memWith.innerHTML = bytesToString(memUsageWith.diff);
    latUsageWith.avg = avg(latUsageWith.levels);
    latWith.innerHTML = latUsageWith.avg + "ms";

    highlightWinners();
  }


  function highlightWinners() {
    // Success Rate and Attempts
    if (attemptsWithout > attemptsWith) {
      rateWith.style.color = "green";
      atmWith.style.color = "green";
    } else if (attemptsWithout < attemptsWith) {
      rateWithout.style.color = "green";
      atmWithout.style.color = "green";
    }

    // Battery
    if (batUsageWithout.diff > batUsageWith.diff) {
      batWith.style.color = "green";
    } else if (batUsageWithout.diff < batUsageWith.diff) {
      batWithout.style.color = "green";
    }

    // Memory
    if (memUsageWithout.diff > memUsageWith.diff) {
      memWith.style.color = "green";
    } else if (memUsageWithout.diff < memUsageWith.diff) {
      memWithout.style.color = "green";
    }

    // Data Usage
    if (dataWithout > dataWith) {
      dWith.style.color = "green";
    } else if (dataWithout < dataWith) {
      dWithout.style.color = "green";
    }

    // Latency
    if (latUsageWithout.avg > latUsageWith.avg) {
      latWith.style.color = "green";
    } else if (latUsageWithout.avg < latUsageWith.avg) {
      latWithout.style.color = "green";
    }
  }


  function bytesToString(bytes) {
    if (isNaN(bytes)) {
      return "0b";
    }

    var kb = bytes / 1000;
    var mb = bytes / 1000000;
    var gb = bytes / 1000000000;

    if (gb > 1) { // gb
      return gb.toFixed(2) + "gb";
    } else if (mb > 1) { //mb
      return mb.toFixed(2) + "mb";
    } else if (kb > 1) { // kb
      return kb.toFixed(2) + "kb";
    } else {
      return bytes + "b";
    }
  }


  function avg(arr) {
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      sum += arr[i];
    }

    return (sum / arr.length).toFixed(0);
  }


  function resetLabels() {
    progressBar.setAttributeNS(null, 'value', '0');
    netStatus.innerHTML = "Unknown";
    intStatus.innerHTML = "";
    rateWithout.innerHTML = "";
    rateWith.innerHTML = "";
    atmWithout.innerHTML = "";
    atmWith.innerHTML = "";
    sucWithout.innerHTML = "";
    sucWith.innerHTML = "";
    batWithout.innerHTML = "";
    batWith.innerHTML = "";
    memWithout.innerHTML = "";
    memWith.innerHTML = "";
    dWithout.innerHTML = "";
    dWith.innerHTML = "";
    latWithout.innerHTML = "";
    latWith.innerHTML = "";

    // Reset colors
    rateWithout.style.color = "black";
    rateWith.style.color = "black";
    atmWithout.style.color = "black";
    atmWith.style.color = "black";
    sucWithout.style.color = "black";
    sucWith.style.color = "black";
    batWithout.style.color = "black";
    batWith.style.color = "black";
    memWithout.style.color = "black";
    memWith.style.color = "black";
    dWithout.style.color = "black";
    dWith.style.color = "black";
    latWithout.style.color = "black";
    latWith.style.color = "black";
  }


  function resetCounters() {
    firstInterrupt = null;
    attemptsWith = 0;
    attemptsWithout = 0;
    successesWith = 0;
    successesWithout = 0;
    dataWith = 0;
    dataWithout = 0;
    batUsageWith.base = 0;
    batUsageWith.diff = 0;
    batUsageWithout.base = 0;
    batUsageWithout.diff = 0;
    memUsageWith.base = 0;
    memUsageWith.diff = 0;
    memUsageWith.max = 0;
    memUsageWithout.base = 0;
    memUsageWithout.diff = 0;
    memUsageWithout.max = 0;
    latUsageWith.avg = 0;
    latUsageWith.levels = [];
    latUsageWithout.avg = 0;
    latUsageWithout.levels = [];
  }


  function timeoutCalled(func) {
    atmWithout.innerHTML = attemptsWithout;
    atmWith.innerHTML = attemptsWith;

    if (func === sendRequestWithout) {
      clearTimeout(timeoutWithout);
      sendRequestWithout();
    } else if (func === sendRequestWith) {
      clearTimeout(timeoutWith);
      sendRequestWith();
    }
  }


  function showError(text) {
    // Failure COULD be because there is no CORS support on requested api
    console.log("ERROR: " + text);
  }

});
