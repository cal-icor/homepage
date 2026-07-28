(function () {
  var CA_BOUNDS = L.latLngBounds(
    [32.45, -124.55],
    [42.1, -114.0]
  );

  var MARKER_TARGET_X = 0.5;
  var MARKER_TARGET_Y = 0.78;
  var POPUP_VIEW_PADDING = 20;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function initialsFor(name) {
    var parts = String(name)
      .replace(/\(.*?\)/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function showAvatarInitials(avatar, name) {
    avatar.innerHTML = '';
    var initials = document.createElement('span');
    initials.className = 'partner-list-initials';
    initials.textContent = initialsFor(name);
    avatar.appendChild(initials);
  }

  function logoUrl(path) {
    if (!path) return '';
    path = String(path).trim();
    if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) {
      return path;
    }
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    return path;
  }

  function readPartnersFromDom() {
    var partners = [];
    document.querySelectorAll('.partner-list-item[data-partner-id]').forEach(function (el) {
      var lat = parseFloat(el.getAttribute('data-partner-lat'));
      var lng = parseFloat(el.getAttribute('data-partner-lng'));
      if (!el.getAttribute('data-partner-id') || isNaN(lat) || isNaN(lng)) return;
      partners.push({
        id: el.getAttribute('data-partner-id'),
        name: el.getAttribute('data-partner-name') || '',
        logo: el.getAttribute('data-partner-logo') || '',
        url: el.getAttribute('data-partner-url') || '',
        hub: el.getAttribute('data-partner-hub') || '',
        lat: lat,
        lng: lng,
      });
    });
    return partners;
  }

  function popupHtml(partner) {
    var imgSrc = logoUrl(partner.logo);
    var logoBlock = imgSrc
      ? '<div class="partner-map-popup-logo-wrap">' +
        '<img class="partner-map-popup-logo" src="' +
        escapeAttr(imgSrc) +
        '" alt="' +
        escapeAttr(partner.name) +
        '">' +
        '</div>'
      : '';
    var siteUrl = partner.url || '#';
    var hubLink = partner.hub
      ? '<a class="partner-map-popup-link partner-map-popup-link--hub" href="' +
        escapeAttr(partner.hub) +
        '" target="_blank" rel="noopener">View Hub</a>'
      : '';
    return (
      '<div class="partner-map-popup">' +
      logoBlock +
      '<p class="partner-map-popup-name">' +
      escapeHtml(partner.name) +
      '</p>' +
      '<div class="partner-map-popup-actions">' +
      '<a class="partner-map-popup-link" href="' +
      escapeAttr(siteUrl) +
      '" target="_blank" rel="noopener">Visit website</a>' +
      hubLink +
      '</div>' +
      '</div>'
    );
  }

  function createDotIcon(active) {
    var size = active ? 16 : 14;
    var dot = active ? 12 : 10;
    var fill = active ? '#0e7490' : '#1a56db';
    return L.divIcon({
      className: 'partner-map-dot-wrap' + (active ? ' partner-map-dot-wrap--active' : ''),
      html:
        '<span class="partner-map-dot" style="display:block;width:' +
        dot +
        'px;height:' +
        dot +
        'px;background:' +
        fill +
        ';border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.35);" aria-hidden="true"></span>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2) - 4],
    });
  }

  function init() {
    var canvas = document.getElementById('partner-map-canvas');
    if (!canvas || typeof L === 'undefined') return;

    var partners = readPartnersFromDom();
    if (!partners.length) return;

    var partnersById = {};
    partners.forEach(function (p) {
      partnersById[p.id] = p;
    });

    var markersById = {};
    var activeId = null;

    function isDark() {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function tileUrl() {
      return isDark()
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    }

    var map = L.map(canvas, {
      scrollWheelZoom: true,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 12,
      maxBounds: CA_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    var tileLayer = L.tileLayer(tileUrl(), {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.fitBounds(CA_BOUNDS, { padding: [12, 12], maxZoom: 7 });

    function positionMarkerInMapFrame(marker, done) {
      map.invalidateSize();
      var latlng = marker.getLatLng();
      var mapSize = map.getSize();
      var markerPoint = map.latLngToContainerPoint(latlng);
      var targetPoint = L.point(
        mapSize.x * MARKER_TARGET_X,
        mapSize.y * MARKER_TARGET_Y
      );
      // Pan so the marker moves toward the bottom of the map frame (not the top).
      map.panBy(markerPoint.subtract(targetPoint), {
        animate: true,
        duration: 0.35,
      });
      if (done) {
        map.once('moveend', function onPanEnd() {
          map.off('moveend', onPanEnd);
          done();
        });
      }
    }

    function ensurePopupInView(marker, done) {
      var popup = marker.getPopup();
      if (!popup || !popup.isOpen()) {
        if (done) done();
        return;
      }

      map.invalidateSize();
      var popupEl = popup.getElement();
      if (!popupEl) {
        if (done) done();
        return;
      }

      var mapRect = map.getContainer().getBoundingClientRect();
      var popupRect = popupEl.getBoundingClientRect();
      var pad = POPUP_VIEW_PADDING;
      var dx = 0;
      var dy = 0;

      if (popupRect.left < mapRect.left + pad) {
        dx = popupRect.left - (mapRect.left + pad);
      } else if (popupRect.right > mapRect.right - pad) {
        dx = popupRect.right - (mapRect.right - pad);
      }

      if (popupRect.top < mapRect.top + pad) {
        dy = popupRect.top - (mapRect.top + pad);
      } else if (popupRect.bottom > mapRect.bottom - pad) {
        dy = popupRect.bottom - (mapRect.bottom - pad);
      }

      if (!dx && !dy) {
        if (done) done();
        return;
      }

      map.panBy([dx, dy], { animate: true, duration: 0.25 });
      if (done) {
        map.once('moveend', function onFitEnd() {
          map.off('moveend', onFitEnd);
          done();
        });
      }
    }

    function openMarkerPopup(marker, done) {
      marker.openPopup();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ensurePopupInView(marker, done);
        });
      });
    }

    function centerOnMarker(marker, thenOpenPopup) {
      var latlng = marker.getLatLng();
      var zoom = Math.max(map.getZoom(), 8);

      map.flyTo(latlng, zoom, { animate: true, duration: 0.45 });

      map.once('moveend', function onFlyEnd() {
        map.off('moveend', onFlyEnd);
        if (!thenOpenPopup) return;
        positionMarkerInMapFrame(marker, function () {
          openMarkerPopup(marker);
        });
      });
    }

    function scrollListItemIntoView(id) {
      var item = document.querySelector(
        '.partner-list-item[data-partner-id="' + id + '"]'
      );
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function setMarkerIcons() {
      Object.keys(markersById).forEach(function (id) {
        markersById[id].setIcon(createDotIcon(id === activeId));
      });
    }

    function openPartner(id, options) {
      options = options || {};
      var partner = partnersById[id];
      var marker = markersById[id];
      if (!partner || !marker) return;

      if (activeId && markersById[activeId]) {
        markersById[activeId].closePopup();
      }

      activeId = id;
      setMarkerIcons();
      marker.setPopupContent(popupHtml(partner));

      document.querySelectorAll('.partner-list-item[data-partner-id]').forEach(function (el) {
        var isActive = el.getAttribute('data-partner-id') === id;
        el.classList.toggle('partner-list-item--active', isActive);
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      scrollListItemIntoView(id);

      if (options.fly !== false) {
        centerOnMarker(marker, true);
      } else {
        positionMarkerInMapFrame(marker, function () {
          openMarkerPopup(marker);
        });
      }
    }

    partners.forEach(function (partner) {
      var marker = L.marker([partner.lat, partner.lng], {
        icon: createDotIcon(false),
      }).addTo(map);

      marker.bindPopup(popupHtml(partner), {
        className: 'partner-map-leaflet-popup',
        minWidth: 200,
        maxWidth: 220,
        autoPan: false,
      });

      marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        openPartner(partner.id, { fly: false });
      });

      markersById[partner.id] = marker;
    });

    document.querySelectorAll('.partner-list-item[data-partner-id]').forEach(function (el) {
      var avatar = el.querySelector('.partner-list-avatar');
      var img = avatar && avatar.querySelector('img');
      if (img) {
        img.addEventListener('error', function () {
          showAvatarInitials(avatar, el.getAttribute('data-partner-name') || '');
        });
      }

      el.addEventListener('click', function (e) {
        e.preventDefault();
        var id = el.getAttribute('data-partner-id');
        openPartner(id, { fly: true });
      });
    });

    var search = document.getElementById('partner-search-input');
    var footer = document.getElementById('partner-list-footer');

    function filterPartners() {
      var query = String(search ? search.value : '').trim().toLowerCase();
      var visibleCount = 0;

      document.querySelectorAll('.partner-list-item[data-partner-id]').forEach(function (el) {
        var name = (el.getAttribute('data-partner-name') || '').toLowerCase();
        var isVisible = !query || name.indexOf(query) !== -1;
        el.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (footer) {
        footer.textContent = query
          ? visibleCount + ' of ' + partners.length + ' colleges shown'
          : partners.length + ' colleges · scroll for more';
      }
    }

    if (search) {
      search.addEventListener('input', filterPartners);
    }

    var themeObserver = new MutationObserver(function () {
      tileLayer.setUrl(tileUrl());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    map.whenReady(function () {
      map.invalidateSize();
    });

    window.addEventListener('resize', function () {
      map.invalidateSize();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
