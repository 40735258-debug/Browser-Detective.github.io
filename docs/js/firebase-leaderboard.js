/* Author: Sergio Pech
   SET08801
   Firebase Leaderboard Cloud
   Syncing all players scores across devices*/


(function () {
  "use strict";

  // Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyBNXbckQidDnRt0Ft1qHBMlYCiRr6IjHY4",
    authDomain: "browser-detective.firebaseapp.com",
    databaseURL: "https://browser-detective-default-rtdb.firebaseio.com",
    projectId: "browser-detective",
    storageBucket: "browser-detective.firebasestorage.app",
    messagingSenderId: "632705835120",
    appId: "1:632705835120:web:bf0e9e35341dd275e014b5",
    measurementId: "G-3957RXPZ5V"
  };

  //Initialization
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  var db = firebase.database();
  var boardRef = db.ref("leaderboard");

  /*Cloud Leaderboard API
   Stores leaderboard scores in Firebase so all players
   can view and share the same global scoreboard
   across every device. */

  var CloudLeaderboard = {

    /*Updates a run entry in Firebase.*/
    pushRun: function (entry) {
      if (!entry || !entry.id) return;

      //Uses the run id as the Firebase key so it updates aand overwrite
      boardRef.child(entry.id).set({
        id:           entry.id,
        name:         entry.name         || "Anonymous",
        highestLevel: entry.highestLevel  || 0,
        playTimeSec:  entry.playTimeSec   || 0,
        completed:    !!entry.completed,
        startedAt:    entry.startedAt     || null,
        finishedAt:   entry.finishedAt    || null
      });
    },

     /*Fetch the full leaderboard once*/
    fetch: function () {
      return boardRef.once("value").then(function (snapshot) {
        var rows = [];
        snapshot.forEach(function (child) {
          rows.push(child.val());
        });
        return CloudLeaderboard._sort(rows);
      });
    },

    listen: function (callback) {
      boardRef.on("value", function (snapshot) {
        var rows = [];
        snapshot.forEach(function (child) {
          rows.push(child.val());
        });
        callback(CloudLeaderboard._sort(rows));
      });
    },

    /*Stops listening for real-time changes.*/
    stopListening: function () {
      boardRef.off("value");
    },

    /*Clears the entire cloud leaderboard.*/
    clear: function () {
      return boardRef.remove();
    },

    /*Removes a single run by its id.*/
    removeRun: function (runId) {
      if (!runId) return;
      return boardRef.child(runId).remove();
    },

    /*Sorts rows the same way the local leaderboard does*/
    _sort: function (rows) {
      rows.sort(function (a, b) {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        if (b.highestLevel !== a.highestLevel) return b.highestLevel - a.highestLevel;
        var at = a.playTimeSec || 0, bt = b.playTimeSec || 0;
        if (a.completed && b.completed) return at - bt;   // fastest wins
        return bt - at;                                     // longest investigation
      });
      return rows;
    }
  };

  window.CloudLeaderboard = CloudLeaderboard;
})();
