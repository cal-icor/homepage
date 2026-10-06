// Usage map: one dot per student this term, scattered around their campus and
// colored by system (UC, CSU or community college). Dots crowd near the campus
// and thin out with distance, never overlap one another, and never land
// outside the state. Positions are seeded, so the map is the same every load.
(function () {
  var root = document.querySelector('.hub-map');
  var dataEl = document.getElementById('hub-map-data');
  if (!root || !dataEl) return;

  var data = JSON.parse(dataEl.textContent);
  var outline = data.outline;
  var proj = outline.projection;
  var land = outline.points;

  // Map units: about 2.2 km each.
  var DOT_RADIUS = 0.6;
  var DOT_GAP = 1.45; // minimum distance between any two dots
  var SYSTEMS = ['uc', 'csu', 'ccc'];
  var HOVER_SLOP = 8; // CSS px from the nearest dot
  var GROW_MS = 900; // a cluster fills in from the campus outward over this long
  var FADE_MS = 300; // each dot's fade-in

  // How far a campus's dots spread (a normal distribution's sigma): wider for
  // bigger campuses, but slower than their dot count grows, so big campuses
  // read as dense rather than sprawling.
  function spread(n) { return 1.5 + 0.35 * Math.sqrt(n); }

  var canvas = root.querySelector('.hub-map-canvas');
  var figure = root.querySelector('.hub-map-figure');
  var tooltip = root.querySelector('.hub-map-tooltip');
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function project(lat, lng) {
    return [(lng - proj.lng0) * proj.kx + proj.pad, (proj.latMax - lat) * proj.ky + proj.pad];
  }

  function onLand(x, y) {
    var inside = false;
    for (var i = 0, j = land.length - 1; i < land.length; j = i++) {
      var xi = land[i][0], yi = land[i][1], xj = land[j][0], yj = land[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // Seeded PRNG (mulberry32 over a string hash): the same jitter every load.
  function random(seed) {
    var h = 1779033703 ^ seed.length;
    for (var i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    var a = h >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Dots ----------------------------------------------------------------

  var clusters = data.campuses
    .filter(function (c) { return c.term > 0; })
    .map(function (c) {
      var p = project(c.lat, c.lng);
      return { campus: c, x: p[0], y: p[1], sigma: spread(c.term), rand: random(c.id), placed: 0,
               color: Math.max(0, SYSTEMS.indexOf(c.system)) };
    });

  var dots = [];
  var grid = new Map(); // spatial hash of dot indices, cell = DOT_GAP

  function cellKey(gx, gy) { return gx * 4096 + gy; }

  function forNear(x, y, radius, fn) {
    var r = Math.ceil(radius / DOT_GAP);
    var gx = Math.floor(x / DOT_GAP), gy = Math.floor(y / DOT_GAP);
    for (var dx = -r; dx <= r; dx++) {
      for (var dy = -r; dy <= r; dy++) {
        var list = grid.get(cellKey(gx + dx, gy + dy));
        if (list) list.forEach(fn);
      }
    }
  }

  function crowded(x, y) {
    var hit = false;
    forNear(x, y, DOT_GAP, function (k) {
      var d = dots[k];
      if ((d.x - x) * (d.x - x) + (d.y - y) * (d.y - y) < DOT_GAP * DOT_GAP) hit = true;
    });
    return hit;
  }

  // Sample around the campus until a spot is on land and clear of other dots,
  // widening the search as the area fills up.
  function place(c) {
    for (var attempt = 0; attempt < 400; attempt++) {
      var s = c.sigma * (1 + attempt / 30);
      var r = Math.sqrt(-2 * Math.log(c.rand() || 1e-9)) * s, t = 2 * Math.PI * c.rand();
      var x = c.x + r * Math.cos(t), y = c.y + r * Math.sin(t);
      if (onLand(x, y) && !crowded(x, y)) return [x, y];
    }
    return null;
  }

  // Campuses take turns, one dot each, so no campus claims a shared area first.
  var most = Math.max.apply(null, clusters.map(function (c) { return c.campus.term; }).concat(0));
  for (var i = 0; i < most; i++) {
    clusters.forEach(function (c, ci) {
      if (i >= c.campus.term) return;
      var p = place(c);
      if (!p) return;
      var key = cellKey(Math.floor(p[0] / DOT_GAP), Math.floor(p[1] / DOT_GAP));
      (grid.get(key) || grid.set(key, []).get(key)).push(dots.length);
      // Early dots sit nearest the campus, so the cluster fills in outward.
      dots.push({ x: p[0], y: p[1], c: ci, color: c.color, start: Math.sqrt(i / c.campus.term) * GROW_MS });
      c.placed++;
    });
  }

  // ---- Draw ----------------------------------------------------------------

  var scale = 1, dpr = 1, hovered = -1, colors = {};
  var startedAt = null; // set when the clusters start growing

  function readColors() {
    var style = getComputedStyle(root);
    colors.dots = SYSTEMS.map(function (s) { return style.getPropertyValue('--hub-map-' + s).trim(); });
    colors.land = style.getPropertyValue('--hub-map-land').trim();
    colors.edge = style.getPropertyValue('--hub-map-edge').trim();
  }

  // Returns true while any dot is still fading in.
  function draw(now) {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, outline.width, outline.height);

    ctx.beginPath();
    for (var p = 0; p < land.length; p++) ctx[p ? 'lineTo' : 'moveTo'](land[p][0], land[p][1]);
    ctx.closePath();
    ctx.fillStyle = colors.land;
    ctx.fill();
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = colors.edge;
    ctx.stroke();

    if (startedAt === null) return false;
    var elapsed = now - startedAt, growing = false;
    var radius = Math.max(DOT_RADIUS, 0.6 / scale);
    for (var k = 0; k < dots.length; k++) {
      var d = dots[k];
      ctx.fillStyle = colors.dots[d.color];
      var a = Math.min(1, (elapsed - d.start) / FADE_MS);
      if (a < 1) growing = true;
      if (a <= 0) continue;
      ctx.globalAlpha = hovered >= 0 && d.c !== hovered ? a * 0.25 : a;
      ctx.beginPath();
      ctx.arc(d.x, d.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return growing;
  }

  function redraw() {
    draw(performance.now());
  }

  function animate(now) {
    if (draw(now)) requestAnimationFrame(animate);
  }

  function resize() {
    var width = figure.clientWidth;
    if (!width) return;
    dpr = window.devicePixelRatio || 1;
    scale = width / outline.width;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(outline.height * scale * dpr);
    redraw();
  }

  // ---- Hover ---------------------------------------------------------------

  function clusterAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) / scale, y = (clientY - rect.top) / scale;
    var reach = HOVER_SLOP / scale, best = -1, bestD = reach * reach;
    forNear(x, y, reach, function (k) {
      var d = dots[k], dd = (d.x - x) * (d.x - x) + (d.y - y) * (d.y - y);
      if (dd < bestD) { bestD = dd; best = d.c; }
    });
    return best;
  }

  function format(n) { return n.toLocaleString('en-US'); }

  function point(e) {
    var i = startedAt === null ? -1 : clusterAt(e.clientX, e.clientY);
    if (i !== hovered) { hovered = i; redraw(); }
    if (i < 0) { tooltip.hidden = true; return; }

    var c = clusters[i].campus;
    var parts = [format(c.term) + ' this term', format(c.allTime) + ' all time'];
    if (data.hasDay) parts.push(format(c.day) + ' on ' + data.dayLabel);
    tooltip.textContent = '';
    var name = document.createElement('strong');
    name.textContent = c.name;
    tooltip.appendChild(name);
    tooltip.appendChild(document.createTextNode(parts.join(' · ')));

    var box = figure.getBoundingClientRect();
    tooltip.style.left = e.clientX - box.left + 'px';
    tooltip.style.top = e.clientY - box.top + 'px';
    tooltip.hidden = false;
  }

  canvas.addEventListener('pointermove', point);
  canvas.addEventListener('pointerdown', point);
  canvas.addEventListener('pointerleave', function () {
    hovered = -1;
    tooltip.hidden = true;
    redraw();
  });

  // ---- Wire up -------------------------------------------------------------

  function start() {
    // Reduced motion: start far enough in the past that every dot is settled.
    startedAt = performance.now() - (reduceMotion.matches ? GROW_MS + FADE_MS : 0);
    requestAnimationFrame(animate);
  }

  readColors();
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(figure);
  else window.addEventListener('resize', resize);

  new MutationObserver(function () {
    readColors();
    redraw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Clusters grow the first time the map scrolls into view.
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      start();
    }, { threshold: 0.3 });
    io.observe(figure);
  } else {
    start();
  }
})();
