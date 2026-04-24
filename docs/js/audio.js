/*Author: Sergio Pech  //  SET08801*/
(function () {
  "use strict";

  var MUSIC_FILE = "audio/music.mp3";

  var P = window.DetectiveProgress;

  var audio = document.getElementById("bg-music") || new Audio(MUSIC_FILE);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = P ? P.getMusicVol() : 0.25;

  var isPlaying = false;
  var saveTimer = null;

  audio.addEventListener("play", function(){
    isPlaying = true;
    startSaveTimer();
  });
  audio.addEventListener("pause", function(){
    isPlaying = false;
    stopSaveTimer();
    saveTime();
  });
  audio.addEventListener("ended", function(){
    isPlaying = false;
    if (P) P.setMusicTime(0);
  });
  audio.addEventListener("error", function(){
    console.warn("[DetectiveAudio] Could not load '" + MUSIC_FILE +
                 "'. Place the file next to audio.js or update MUSIC_FILE.");
  });

  function startSaveTimer(){
    stopSaveTimer();
    saveTimer = setInterval(saveTime, 1000);
  }
  function stopSaveTimer(){
    if (saveTimer){ clearInterval(saveTimer); saveTimer = null; }
  }
  function saveTime(){
    if (!P) return;
    if (!audio.duration || !isFinite(audio.duration)) return;
    P.setMusicTime(audio.currentTime || 0);
  }

  window.addEventListener("pagehide", saveTime);
  window.addEventListener("beforeunload", saveTime);
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "hidden") saveTime();
  });

  function start(){
    var p = audio.play();
    if (p && typeof p.catch === "function") p.catch(function(){});
  }
  function stop(){ audio.pause(); }

  function toggle(){
    if (isPlaying){
      stop();
      if (P) P.setMusicOn(false);
      return false;
    } else {
      start();
      if (P) P.setMusicOn(true);
      return true;
    }
  }

  function setVolume(v){
    var vol = Math.max(0, Math.min(1, Number(v) || 0));
    audio.volume = vol;
    if (P) P.setMusicVol(vol);
  }

  function setTrack(src){
    var wasPlaying = isPlaying;
    stop();
    if (P) P.setMusicTime(0);
    audio.src = src;
    if (wasPlaying) start();
  }

  // Music Across Pages
  function autoResume(){
    var tryPlay = function(){
      if (P) {
        var t = P.getMusicTime();
        if (t > 0 && isFinite(audio.duration) && t < audio.duration){
          try { audio.currentTime = t; } catch(e){}
        }
      }
      audio.muted = false;
      start();
      if (P) P.setMusicOn(true);
    };


    audio.muted = true;
    start();
    if (P) P.setMusicOn(true);


    if (audio.readyState >= 1) {
      tryPlay();
    } else {
      audio.addEventListener("loadedmetadata", tryPlay, { once: true });
    }

    // Fallback: unmute and play on first interaction
    var kick = function(){
      if (!isPlaying || audio.muted) tryPlay();
      document.removeEventListener("click",      kick, true);
      document.removeEventListener("keydown",    kick, true);
      document.removeEventListener("touchstart", kick, true);
    };
    document.addEventListener("click",      kick, true);
    document.addEventListener("keydown",    kick, true);
    document.addEventListener("touchstart", kick, true);
  }

  window.DetectiveAudio = {
    start:      start,
    stop:       stop,
    toggle:     toggle,
    isPlaying:  function(){ return isPlaying; },
    setVolume:  setVolume,
    setTrack:   setTrack,
    currentSrc: function(){ return audio.currentSrc || MUSIC_FILE; },
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", autoResume);
  } else {
    autoResume();
  }
})();