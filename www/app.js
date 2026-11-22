/* FartSpace — frontend logic
   Talks to Supabase when config.js is filled in.
   Until then it runs in DEMO MODE with seed posts in memory only.
   No build step, no npm install. Just open index.html (or deploy it).
*/
(function () {
  'use strict';

  var cfg = (window.FARTSPACE_CONFIG || {});
  var configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf('YOUR-PROJECT') === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf('YOUR-ANON') === -1;

  var supabase = null;
  if (configured && window.supabase) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  var badge = document.getElementById('mode-badge');
  if (badge) {
    badge.textContent = configured ? 'LIVE FEED — shared with everyone' : 'DEMO MODE — fill in config.js to go live';
    badge.classList.toggle('demo', !configured);
  }

  // ---- Seed posts (demo mode only; also used as a fallback) ----
  var seedPosts = [
    { id: 'seed-1', author_nickname: 'Sir Ripsalot', title: 'The Elevator Incident', story: 'Doors closed, four strangers, total silence — then I let out a trombone solo that lasted the whole ride. I got off at my floor like a champion.', category: 'proud', loudness: 10, duration: 9, stink: 7, embarrassment: 8, respect_count: 1567, been_there_count: 412, created_at: '2026-11-20T12:00:00Z' },
    { id: 'seed-2', author_nickname: 'QuietQuinn', title: 'Yoga Class Betrayal', story: 'Downward dog. That is all I am going to say. The instructor pretended not to hear it. The whole class pretended not to hear it. We all heard it.', category: 'embarrassing', loudness: 6, duration: 4, stink: 5, embarrassment: 10, respect_count: 89, been_there_count: 1204, created_at: '2026-11-19T12:00:00Z' },
    { id: 'seed-3', author_nickname: 'DadJokeDan', title: 'Thanksgiving, 2019', story: 'I blamed the dog. The dog was asleep outside. Everyone knew. My mother-in-law still brings it up.', category: 'proud', loudness: 8, duration: 7, stink: 9, embarrassment: 6, respect_count: 743, been_there_count: 388, created_at: '2026-11-18T12:00:00Z' },
    { id: 'seed-4', author_nickname: 'LibraryLaura', title: 'The Silent But Deadly Study Hall', story: 'No sound at all. That was the problem. Within thirty seconds, three people had packed up and left. I stayed and studied. A hero.', category: 'embarrassing', loudness: 1, duration: 3, stink: 10, embarrassment: 9, respect_count: 210, been_there_count: 956, created_at: '2026-11-17T12:00:00Z' },
    { id: 'seed-5', author_nickname: 'Sir Ripsalot', title: 'Wedding Toast, But Make It Windy', story: 'Mid-toast, mid-sentence, a squeaker escaped. The best man laughed so hard he cried. The bride laughed too. I consider this a win.', category: 'proud', loudness: 5, duration: 6, stink: 4, embarrassment: 7, respect_count: 512, been_there_count: 301, created_at: '2026-11-16T12:00:00Z' },
    { id: 'seed-6', author_nickname: 'GymRatGail', title: 'Leg Day, Rep Three', story: 'Squats do things to a person. The whole rack heard it. My spotter just said “nice depth” and we carried on like professionals.', category: 'embarrassing', loudness: 9, duration: 5, stink: 6, embarrassment: 8, respect_count: 640, been_there_count: 720, created_at: '2026-11-15T12:00:00Z' }
  ];

  var posts = [];
  var filter = 'all';
  var leaderTab = 'loudness';
  var reacted = {}; // postId:type -> true (local, so one tap = one reaction per visit)

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 3500);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Data: fetch approved posts only ----
  async function loadPosts() {
    if (!configured) { posts = seedPosts.slice(); renderAll(); return; }
    try {
      var res = await supabase
        .from('posts')
        .select('*, reactions(type)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(100);
      if (res.error) throw res.error;
      posts = (res.data || []).map(function (p) {
        var r = p.reactions || [];
        p.respect_count = r.filter(function (x) { return x.type === 'respect'; }).length;
        p.been_there_count = r.filter(function (x) { return x.type === 'been_there'; }).length;
        return p;
      });
      if (!posts.length) posts = seedPosts.slice(); // live DB, no approved posts yet
    } catch (e) {
      console.error('FartSpace: could not load posts, using demo posts.', e);
      posts = seedPosts.slice();
    }
    renderAll();
  }

  // ---- Rendering ----
  function postCard(p) {
    var tag = p.category === 'proud'
      ? '<span class="tag proud">😎 PROUD</span>'
      : '<span class="tag embarrassing">😳 EMBARRASSING</span>';
    return '<article class="post">' +
      '<h3>' + esc(p.title) + '</h3>' +
      '<div class="meta">' + tag + ' by <b>' + esc(p.author_nickname) + '</b> · ' + new Date(p.created_at).toLocaleDateString() + '</div>' +
      '<p>' + esc(p.story) + '</p>' +
      '<div class="scores"><span>🔊 Loudness <b>' + p.loudness + '/10</b></span>' +
      '<span>⏱️ Duration <b>' + p.duration + '/10</b></span>' +
      '<span>🤢 Stink <b>' + p.stink + '/10</b></span>' +
      '<span>😳 Embarrassment <b>' + p.embarrassment + '/10</b></span></div>' +
      '<div class="react">' +
      '<button type="button" data-react="respect" data-id="' + esc(p.id) + '">🫡 Respect (' + (p.respect_count || 0) + ')</button>' +
      '<button type="button" data-react="been_there" data-id="' + esc(p.id) + '">🤝 We\'ve All Been There (' + (p.been_there_count || 0) + ')</button>' +
      '</div></article>';
  }

  function renderFeed() {
    var el = document.getElementById('feed');
    if (!el) return;
    var list = posts.filter(function (p) { return filter === 'all' || p.category === filter; });
    el.innerHTML = list.length ? list.map(postCard).join('') : '<p>No farts in this category yet. Be the first. Be brave.</p>';
    el.querySelectorAll('[data-react]').forEach(function (btn) {
      btn.addEventListener('click', function () { react(btn.getAttribute('data-id'), btn.getAttribute('data-react'), btn); });
    });
  }

  function renderFartOfDay() {
    var el = document.getElementById('fart-of-day');
    if (!el || !posts.length) return;
    // Deterministic pick by day of year, so everyone sees the same one.
    var day = Math.floor(Date.now() / 86400000);
    el.innerHTML = postCard(posts[day % posts.length]);
    el.querySelectorAll('[data-react]').forEach(function (btn) {
      btn.addEventListener('click', function () { react(btn.getAttribute('data-id'), btn.getAttribute('data-react'), btn); });
    });
  }

  function renderLeaderboard() {
    var el = document.getElementById('leaderboard');
    if (!el) return;
    var sorted = posts.slice().sort(function (a, b) { return (b[leaderTab] || 0) - (a[leaderTab] || 0); }).slice(0, 5);
    var label = { loudness: 'Loudness', duration: 'Duration', embarrassment: 'Embarrassment' }[leaderTab];
    el.innerHTML = sorted.length ? sorted.map(function (p, i) {
      return '<div class="leader-row"><span><b>#' + (i + 1) + '</b> ' + esc(p.title) + ' — ' + esc(p.author_nickname) + '</span><span><b>' + p[leaderTab] + '/10</b> ' + label + '</span></div>';
    }).join('') : '<p>No leaderboard yet.</p>';
  }

  function renderContributors() {
    var el = document.getElementById('contributors');
    if (!el) return;
    var byAuthor = {};
    posts.forEach(function (p) {
      (byAuthor[p.author_nickname] = byAuthor[p.author_nickname] || []).push(p);
    });
    var authors = Object.keys(byAuthor).sort(function (a, b) {
      return byAuthor[b].reduce(function (s, p) { return s + (p.respect_count || 0); }, 0) -
             byAuthor[a].reduce(function (s, p) { return s + (p.respect_count || 0); }, 0);
    }).slice(0, 3);
    el.innerHTML = authors.map(function (name) {
      var top3 = byAuthor[name].slice().sort(function (a, b) { return (b.respect_count || 0) - (a.respect_count || 0); }).slice(0, 3);
      return '<div class="person"><div><b>' + esc(name) + '</b><div class="meta">Pinned Top 3: ' + top3.map(function (p) { return esc(p.title); }).join(' · ') + '</div></div>' +
        '<span><b>' + top3.reduce(function (s, p) { return s + (p.respect_count || 0); }, 0) + '</b> Respect</span></div>';
    }).join('') || '<p>No legends yet.</p>';
  }

  function renderAll() { renderFeed(); renderFartOfDay(); renderLeaderboard(); renderContributors(); }

  // ---- Reactions ----
  async function react(postId, type, btn) {
    var key = postId + ':' + type;
    if (reacted[key]) { toast('You already gave that one. Greedy.'); return; }
    reacted[key] = true;
    btn.classList.add('on');
    var post = posts.find(function (p) { return String(p.id) === String(postId); });
    if (post) {
      if (type === 'respect') post.respect_count = (post.respect_count || 0) + 1;
      else post.been_there_count = (post.been_there_count || 0) + 1;
      renderFeed(); renderLeaderboard(); renderContributors();
    }
    if (configured && String(postId).indexOf('seed-') !== 0) {
      var res = await supabase.from('reactions').insert({ post_id: postId, type: type });
      if (res.error) console.error('Reaction failed:', res.error);
    }
    toast(type === 'respect' ? '🫡 Respect given.' : '🤝 We\'ve all been there.');
  }

  // ---- Let One Rip + Fart-O-Meter ----
  var rips = 0;
  var ripBtn = document.getElementById('rip-btn');
  if (ripBtn) ripBtn.addEventListener('click', function () {
    rips++;
    var fill = document.getElementById('meter-fill');
    var label = document.getElementById('meter-label');
    if (fill) fill.style.width = Math.min(100, rips * 12) + '%';
    if (label) label.textContent = 'Rips today: ' + rips + (rips === 1 ? ' — a modest start.' : rips < 5 ? ' — warming up nicely.' : ' — the neighbours have been notified.');
    playFart('classic');
    toast('💨 Ripped! The Fart-O-Meter has noted this.');
  });

  // ---- Sound board: real recorded sounds in sounds/ ----
  // Each button plays a different real fart recording (Daily Sounds,
  // free for personal and commercial use, no attribution required).
  // No synthesized sounds: the old Web Audio fart synth is gone.
  var SOUND_FILES = {
    classic: 'sounds/fart-classic.mp3',
    long: 'sounds/fart-long.mp3',
    wet: 'sounds/fart-wet.mp3',
    squeaky: 'sounds/fart-squeaky.mp3',
    deep: 'sounds/fart-deep.mp3',
    blast: 'sounds/fart-blast.mp3'
  };
  var currentAudio = null;
  function playFart(kind) {
    try {
      var src = SOUND_FILES[kind] || SOUND_FILES.classic;
      if (currentAudio) currentAudio.pause();
      currentAudio = new Audio(src);
      currentAudio.play().catch(function (e) { console.error('Sound failed (browser may need a tap first):', e); });
      return currentAudio;
    } catch (e) { console.error('Sound failed (browser may need a tap first):', e); return null; }
  }
  document.querySelectorAll('#sound-grid button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#sound-grid button').forEach(function (b) { b.classList.remove('playing'); });
      btn.classList.add('playing');
      var audio = playFart(btn.getAttribute('data-sound'));
      var clear = function () { btn.classList.remove('playing'); };
      if (audio) audio.addEventListener('ended', clear);
      setTimeout(clear, 4500);
    });
  });

  // ---- Filters / tabs ----
  document.querySelectorAll('#feed-filters button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#feed-filters button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active'); filter = btn.getAttribute('data-filter'); renderFeed();
    });
  });
  document.querySelectorAll('#leader-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#leader-tabs button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active'); leaderTab = btn.getAttribute('data-tab'); renderLeaderboard();
    });
  });

  // ---- Slider labels ----
  ['loudness', 'duration', 'stink', 'embarrassment'].forEach(function (id) {
    var input = document.getElementById(id), out = document.getElementById(id + '-val');
    if (input && out) input.addEventListener('input', function () { out.textContent = input.value; });
  });

  // ---- Share Your Fart: always goes to PENDING moderation ----
  var form = document.getElementById('share-form');
  if (form) form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var data = {
      author_nickname: document.getElementById('nickname').value.trim(),
      title: document.getElementById('title').value.trim(),
      story: document.getElementById('story').value.trim(),
      category: document.getElementById('category').value,
      loudness: parseInt(document.getElementById('loudness').value, 10),
      duration: parseInt(document.getElementById('duration').value, 10),
      stink: parseInt(document.getElementById('stink').value, 10),
      embarrassment: parseInt(document.getElementById('embarrassment').value, 10),
      status: 'pending'
    };
    if (!configured) {
      toast('Posted! In demo mode it lives only in your browser — fill in config.js to send it to moderation.');
      form.reset(); return;
    }
    var res = await supabase.from('posts').insert(data);
    if (res.error) { toast('Hmm, that one did not go through: ' + res.error.message); return; }
    toast('Posted! It now goes to the moderator. It will appear in the feed once approved.');
    form.reset();
  });

  // ---- Live updates (when configured) ----
  if (configured) {
    supabase.channel('fartspace-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, loadPosts)
      .subscribe();
  }

  // ---- Installable PWA: register the service worker (app shell only) ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (e) {
        console.error('FartSpace: service worker registration failed.', e);
      });
    });
  }

  loadPosts();
})();
