(function(){
  const audio = document.getElementById('audio');
  const platter = document.getElementById('platter');
  const tonearm = document.getElementById('tonearm');
  const deckCaption = document.getElementById('deckCaption');
  const labelText = document.getElementById('labelText');

  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const progress = document.getElementById('progress');
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');

  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const repeatBtn = document.getElementById('repeatBtn');
  const autoplayBtn = document.getElementById('autoplayBtn');
  const volume = document.getElementById('volume');
  const volIcon = document.getElementById('volIcon');
  const playlistEl = document.getElementById('playlist');
  const playlistCount = document.getElementById('playlistCount');
  const addSongsBtn = document.getElementById('addSongsBtn');
  const fileInput = document.getElementById('fileInput');

  let currentIndex = 0;
  let isPlaying = false;
  let isShuffle = false;
  let isRepeat = false;
  let isAutoplay = true;
  let isSeeking = false;

  function formatTime(sec){
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function buildPlaylist(){
    playlistEl.innerHTML = "";
    tracks.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'track';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.dataset.index = i;
      li.innerHTML = `
        <span class="track-index">${String(i+1).padStart(2,'0')}</span>
        <span class="track-bars"><span></span><span></span><span></span></span>
        <span class="track-info">
          <div class="track-title"></div>
          <div class="track-artist"></div>
        </span>
        <span class="track-dur">--:--</span>
      `;
      li.querySelector('.track-title').textContent = t.title;
      li.querySelector('.track-artist').textContent = t.artist;

      li.addEventListener('click', () => loadTrack(i, true));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadTrack(i, true); }
      });

      playlistEl.appendChild(li);
    });
    playlistCount.textContent = tracks.length + " tracks";
    preloadDurations();
  }

  function preloadDurations(){

    let i = 0;
    function loadNext(){
      if (i >= tracks.length) return;
      const index = i;
      const t = tracks[index];
      const a = new Audio();
      a.preload = "metadata";

      const finish = () => { i++; loadNext(); };

      a.addEventListener('loadedmetadata', () => {
        const li = playlistEl.querySelector(`.track[data-index="${index}"] .track-dur`);
        if (li) li.textContent = formatTime(a.duration);
        finish();
      });
      a.addEventListener('error', () => {
        const li = playlistEl.querySelector(`.track[data-index="${index}"] .track-dur`);
        if (li) li.textContent = "unavailable";
        finish();
      });

      a.src = t.src;
    }
    loadNext();
  }

  function highlightActive(){
    document.querySelectorAll('.track').forEach(li => {
      const i = Number(li.dataset.index);
      li.classList.toggle('active', i === currentIndex);
    });
  }

  function loadTrack(index, autoplayThis){
    currentIndex = (index + tracks.length) % tracks.length;
    const t = tracks[currentIndex];
    audio.src = t.src;
    trackTitle.textContent = t.title;
    trackArtist.textContent = t.artist;
    labelText.textContent = "TRK " + String(currentIndex+1).padStart(2,'0');
    document.title = t.title + " — " + t.artist;
    highlightActive();
    progress.value = 0;
    progress.style.background = `linear-gradient(to right, var(--copper) 0%, var(--line-strong) 0%)`;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";

    if (autoplayThis){
      audio.play().catch(()=>{});
    }
  }

  function setPlayingUI(playing){
    isPlaying = playing;
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    platter.classList.toggle('spinning', playing);
    tonearm.classList.toggle('playing', playing);
    deckCaption.textContent = playing ? "Now Spinning" : "Paused";
  }

  function togglePlay(){
    if (!audio.src) loadTrack(0, false);
    if (audio.paused){
      audio.play().catch(()=>{});
    } else {
      audio.pause();
    }
  }

  function playNext(){
    if (isShuffle){
      let next = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1){
        while (next === currentIndex) next = Math.floor(Math.random() * tracks.length);
      }
      loadTrack(next, true);
    } else {
      loadTrack(currentIndex + 1, true);
    }
  }

  function playPrev(){
    if (audio.currentTime > 3){
      audio.currentTime = 0;
      return;
    }
    loadTrack(currentIndex - 1, true);
  }


  audio.addEventListener('play', () => setPlayingUI(true));
  audio.addEventListener('pause', () => setPlayingUI(false));

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    progress.max = 100;
  });

  audio.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.value = pct;
    progress.style.background = `linear-gradient(to right, var(--copper) ${pct}%, var(--line-strong) ${pct}%)`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('ended', () => {
    if (isRepeat){
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (isAutoplay){
      playNext();
    } else {
      setPlayingUI(false);
    }
  });

  audio.addEventListener('error', () => {
    deckCaption.textContent = "Couldn't load this track";
    setPlayingUI(false);
  });


  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', playNext);
  prevBtn.addEventListener('click', playPrev);

  shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    shuffleBtn.setAttribute('aria-pressed', String(isShuffle));
  });

  repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
    repeatBtn.setAttribute('aria-pressed', String(isRepeat));
  });

  autoplayBtn.addEventListener('click', () => {
    isAutoplay = !isAutoplay;
    autoplayBtn.classList.toggle('active', isAutoplay);
    autoplayBtn.setAttribute('aria-pressed', String(isAutoplay));
  });


  progress.addEventListener('input', () => {
    isSeeking = true;
    const pct = progress.value;
    progress.style.background = `linear-gradient(to right, var(--copper) ${pct}%, var(--line-strong) ${pct}%)`;
    if (audio.duration){
      currentTimeEl.textContent = formatTime((pct/100) * audio.duration);
    }
  });
  progress.addEventListener('change', () => {
    if (audio.duration){
      audio.currentTime = (progress.value/100) * audio.duration;
    }
    isSeeking = false;
  });


  function updateVolIcon(v){
    if (v == 0){
      volIcon.innerHTML = '<path d="M3 10v4h4l5 5V5L7 10H3z"/>';
    } else if (v < 50) {
      volIcon.innerHTML = '<path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M15.5 8.5a4 4 0 0 1 0 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
    } else {
      volIcon.innerHTML = '<path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M15.5 8.5a4 4 0 0 1 0 7M18 5.5a8 8 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
    }
  }
  volume.addEventListener('input', () => {
    audio.volume = volume.value / 100;
    updateVolIcon(volume.value);
  });
  audio.volume = volume.value / 100;
  updateVolIcon(volume.value);


  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body){
      e.preventDefault();
      togglePlay();
    }
  });

  addSongsBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const rawName = file.name.replace(/\.[^/.]+$/, "");
      tracks.push({ title: rawName, artist: "Your Library", src: url });
    });
    buildPlaylist();
    fileInput.value = "";
  });


  buildPlaylist();
  loadTrack(0, false);
})();