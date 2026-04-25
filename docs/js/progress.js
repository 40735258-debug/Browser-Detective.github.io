/* Author: Sergio Pech
   SET08801*/

(function () {
  "use strict";

  var KEY_PROGRESS    = "bd.progress";
  var KEY_PLAYER      = "bd.player";
  var KEY_RUN_ID      = "bd.run.id";
  var KEY_RUN_START   = "bd.run.start";
  var KEY_THEME       = "bd.theme";
  var KEY_MUSIC_ON    = "bd.music.on";
  var KEY_MUSIC_VOL   = "bd.music.vol";
  var KEY_MUSIC_TIME  = "bd.music.time";
  var KEY_LEADERBOARD = "bd.leaderboard";
  var TOTAL_LEVELS    = 15;


  var RUN_KEYS = [KEY_PROGRESS, KEY_PLAYER, KEY_RUN_ID, KEY_RUN_START];

  function safeGet(k, fb){
    try { var v = localStorage.getItem(k); return v === null ? fb : v; }
    catch(e){ return fb; }
  }
  function safeSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function safeDel(k){ try { localStorage.removeItem(k); } catch(e){} }

  function readJSON(k, fb){
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return fb;
      var parsed = JSON.parse(raw);
      return parsed == null ? fb : parsed;
    } catch(e){ return fb; }
  }
  function writeJSON(k, v){
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){}
  }

  function readCompleted(){
    var arr = readJSON(KEY_PROGRESS, []);
    return Array.isArray(arr) ? arr : [];
  }
  function writeCompleted(arr){ writeJSON(KEY_PROGRESS, arr); }

  function readBoard(){
    var arr = readJSON(KEY_LEADERBOARD, []);
    return Array.isArray(arr) ? arr : [];
  }
  function writeBoard(arr){ writeJSON(KEY_LEADERBOARD, arr); }

  function nowMs(){ return Date.now(); }
  function nowISO(){ return new Date().toISOString(); }

  function elapsedSec(startISO){
    if (!startISO) return 0;
    var t = Date.parse(startISO);
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((nowMs() - t) / 1000));
  }

  // DetectiveProgress API
  var DetectiveProgress = {
    TOTAL_LEVELS: TOTAL_LEVELS,
    KEYS: {
      progress:    KEY_PROGRESS,
      player:      KEY_PLAYER,
      runId:       KEY_RUN_ID,
      runStart:    KEY_RUN_START,
      theme:       KEY_THEME,
      musicOn:     KEY_MUSIC_ON,
      musicVol:    KEY_MUSIC_VOL,
      musicTime:   KEY_MUSIC_TIME,
      leaderboard: KEY_LEADERBOARD
    },

    //Tracking Level
    markComplete: function (levelNum) {
      var n = Number(levelNum);
      if (!n || n < 1) return;
      var arr = readCompleted();
      if (arr.indexOf(n) === -1){
        arr.push(n);
        arr.sort(function(a,b){ return a-b; });
        writeCompleted(arr);
      }
      //Sync the current leaderboard
      this._syncRunEntry(n);
    },
    isComplete: function (levelNum) {
      return readCompleted().indexOf(Number(levelNum)) !== -1;
    },
    //Level unlocked if it's level 1, or the previous level is complete.
    isUnlocked: function (levelNum) {
      var n = Number(levelNum);
      if (n <= 1) return true;
      return this.isComplete(n - 1);
    },
    all: function () { return readCompleted(); },

    //Reset Progress — clears the current run ONLY. Leaderboard rows are left untouched so every past attempt survives.
    reset: function () {
      for (var i = 0; i < RUN_KEYS.length; i++) safeDel(RUN_KEYS[i]);
    },

    getPlayer: function () {
      var n = safeGet(KEY_PLAYER, "");
      return typeof n === "string" ? n : "";
    },
    hasPlayer: function () { return !!this.getPlayer(); },
    getRunId: function () { return safeGet(KEY_RUN_ID, ""); },
    getRunStart: function () { return safeGet(KEY_RUN_START, ""); },
    getPlayTimeSec: function () { return elapsedSec(this.getRunStart()); },

    // Begin a new run. Creates a leaderboard row for this attempt
    startRun: function (rawName) {
      var name = (rawName == null ? "" : String(rawName)).trim();
      if (!name) name = "Anonymous";
      if (name.length > 24) name = name.slice(0, 24);

      var id = "r" + nowMs() + "-" + Math.floor(Math.random() * 1e6).toString(36);
      var startISO = nowISO();

      safeSet(KEY_PLAYER, name);
      safeSet(KEY_RUN_ID, id);
      safeSet(KEY_RUN_START, startISO);


      writeCompleted([]);

      var board = readBoard();
      board.push({
        id: id,
        name: name,
        highestLevel: 0,
        playTimeSec: 0,
        completed: false,
        startedAt: startISO,
        finishedAt: null
      });
      writeBoard(board);
      return id;
    },

    //Update the current run's leaderboard row
    _syncRunEntry: function (justClearedLevel) {
      var id = this.getRunId();
      if (!id) return;
      var board = readBoard();
      var row = null;
      for (var i = 0; i < board.length; i++){
        if (board[i].id === id){ row = board[i]; break; }
      }
      if (!row) return;
      var n = Number(justClearedLevel) || 0;
      if (n > (row.highestLevel || 0)) row.highestLevel = n;
      row.playTimeSec = this.getPlayTimeSec();
      if (row.highestLevel >= TOTAL_LEVELS){
        row.completed = true;
        if (!row.finishedAt) row.finishedAt = nowISO();
      }
      writeBoard(board);
    },

    //Forces a sync even without a level completion

    touchRun: function () { this._syncRunEntry(0); },

    //Leaderboard
    getLeaderboard: function () {
      //Refresh the in-progress row's play time so the view is live.
      this.touchRun();
      var board = readBoard().slice();
      //Sort: completed first, then highest level, then fastest time.
      board.sort(function (a, b) {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        if (b.highestLevel !== a.highestLevel) return b.highestLevel - a.highestLevel;
        var at = a.playTimeSec || 0, bt = b.playTimeSec || 0;
        if (a.completed && b.completed) return at - bt;       // fastest win
        return bt - at;                                        // longest investigation
      });
      return board;
    },
    clearLeaderboard: function () { writeBoard([]); },

    // ---- theme ----
    getTheme: function(){ return safeGet(KEY_THEME, "dark"); },
    setTheme: function(t){
      t = (t === "pink") ? "pink" : "dark";
      safeSet(KEY_THEME, t);
      applyTheme(t);
    },
    toggleTheme: function(){
      var next = this.getTheme() === "pink" ? "dark" : "pink";
      this.setTheme(next);
      return next;
    },

    getMusicOn: function(){ return safeGet(KEY_MUSIC_ON, "0") === "1"; },
    setMusicOn: function(b){ safeSet(KEY_MUSIC_ON, b ? "1" : "0"); },
    getMusicVol: function(){
      var v = parseFloat(safeGet(KEY_MUSIC_VOL, "0.25"));
      return isNaN(v) ? 0.25 : Math.max(0, Math.min(1, v));
    },
    setMusicVol: function(v){ safeSet(KEY_MUSIC_VOL, String(v)); },
    getMusicTime: function(){
      var t = parseFloat(safeGet(KEY_MUSIC_TIME, "0"));
      return (isNaN(t) || t < 0) ? 0 : t;
    },
    setMusicTime: function(t){ safeSet(KEY_MUSIC_TIME, String(Number(t) || 0)); }
  };

  function applyTheme(t){
    if (!document.documentElement) return;
    document.documentElement.setAttribute("data-theme", t === "pink" ? "pink" : "dark");
  }
  applyTheme(DetectiveProgress.getTheme());

  //Name Entry

  function buildModal() {
    if (document.getElementById("bd-name-modal")) return;

    var overlay = document.createElement("div");
    overlay.id = "bd-name-modal";
    overlay.className = "bd-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "bd-name-title");
    overlay.innerHTML =
      '<div class="bd-modal">' +
        '<div class="bd-modal-chrome">' +
          '<button type="button" class="bd-modal-dot red is-close" id="bd-name-close" aria-label="Close">' +
            '<svg viewBox="0 0 10 10" aria-hidden="true">' +
              '<path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
            '</svg>' +
          '</button>' +
          '<span class="bd-modal-dot yellow"></span>' +
          '<span class="bd-modal-dot green"></span>' +
          '<span class="bd-modal-tab">new investigator · identify yourself</span>' +
        '</div>' +
        '<div class="bd-modal-body">' +
          '<h2 id="bd-name-title">Detective, state your name.</h2>' +
          '<p class="bd-modal-desc">Every attempt on the Hidden Web is logged. Your name, the last case you reached, and your time on the trail all go on the board — cleared runs and abandoned ones alike.</p>' +
          '<label class="bd-modal-label" for="bd-name-input">Detective alias</label>' +
          '<input id="bd-name-input" class="bd-modal-input" type="text" maxlength="24" placeholder="e.g. S. Pech" autocomplete="off" />' +
          '<div class="bd-modal-hint" id="bd-name-hint">2–24 characters. Leaderboard entry created on submit.</div>' +
          '<div class="bd-modal-actions">' +
            '<button type="button" class="bd-modal-btn alt" id="bd-name-cancel">Cancel</button>' +
            '<button type="button" class="bd-modal-btn" id="bd-name-ok">Begin Investigation →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showNameModal(opts){
    opts = opts || {};
    var overlay = buildModal();
    if (!overlay) overlay = document.getElementById("bd-name-modal");

    var input  = overlay.querySelector("#bd-name-input");
    var hint   = overlay.querySelector("#bd-name-hint");
    var okBtn  = overlay.querySelector("#bd-name-ok");
    var cxBtn  = overlay.querySelector("#bd-name-cancel");
    var xBtn   = overlay.querySelector("#bd-name-close");


    input.value = DetectiveProgress.getPlayer() || "";
    hint.className = "bd-modal-hint";
    hint.textContent = "2–24 characters. Leaderboard entry created on submit.";

    cxBtn.style.display = opts.required ? "none" : "";
    function closeModal(){
      hideNameModal();
      if (typeof opts.onCancel === "function") opts.onCancel();
    }
    cxBtn.onclick = closeModal;
    if (xBtn) xBtn.onclick = closeModal;

    okBtn.onclick = submit;
    input.onkeydown = function(e){
      if (e.key === "Enter") { e.preventDefault(); submit(); }
      if (e.key === "Escape") closeModal();
    };

    overlay.classList.add("show");
    setTimeout(function(){ input.focus(); input.select(); }, 30);

    function submit(){
      var name = (input.value || "").trim();
      if (name.length < 2){
        hint.className = "bd-modal-hint bad";
        hint.textContent = "Your alias needs to be at least 2 characters.";
        input.focus();
        return;
      }
      var id = DetectiveProgress.startRun(name);
      hideNameModal();
      if (typeof opts.onOK === "function") opts.onOK(name, id);
      if (opts.navigateTo) window.location.href = opts.navigateTo;
    }
  }

  function hideNameModal(){
    var overlay = document.getElementById("bd-name-modal");
    if (overlay) overlay.classList.remove("show");
  }

  DetectiveProgress.promptForName = showNameModal;
  DetectiveProgress.hideNameModal = hideNameModal;

  // If a player opens a level page without setting a name first, gatemthe page with the modal before any puzzle logic runs.
  function autoGate(){
    var path = (location.pathname || "").toLowerCase();
    var onLevelPage = /level\d+\.html$/.test(path);
    if (!onLevelPage) return;
    if (DetectiveProgress.hasPlayer()) return;

    showNameModal({
      required: true,
      onCancel: function(){ window.location.href = "how-to.html"; }
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", autoGate);
  } else {
    autoGate();
  }

  window.checkAnswer = function (opts) {
    var input = document.getElementById("answer");
    var fb    = document.getElementById("feedback");
    var next  = document.getElementById("next");
    var val   = (input.value || "").trim().toUpperCase();
    var expected = String(opts.expected || "").toUpperCase();

    if (!val) {
      fb.className = "feedback bad";
      fb.textContent = "> empty submission. enter a token.";
      return;
    }
    if (val === expected) {
      fb.className = "feedback ok reveal";
      fb.textContent = "> ACCESS GRANTED. evidence logged. next case unlocked.";
      if (opts.levelNum) DetectiveProgress.markComplete(opts.levelNum);
      if (next) next.classList.add("show");
      input.disabled = true;
    } else {
      fb.className = "feedback bad reveal";
      fb.textContent = "> INVALID TOKEN. re-examine the page.";
    }
  };

  window.DetectiveProgress = DetectiveProgress;
})();
