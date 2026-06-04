(function () {
  var CA_BOUNDS = L.latLngBounds(
    [32.45, -124.55],
    [42.1, -114.0]
  );

  var MARKER_TARGET_X = 0.5;
  var MARKER_TARGET_Y = 0.84;

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
    document.querySelectorAll('.logo-item[data-partner-id]').forEach(function (el) {
      var lat = parseFloat(el.getAttribute('data-partner-lat'));
      var lng = parseFloat(el.getAttribute('data-partner-lng'));
      if (!el.getAttribute('data-partner-id') || isNaN(lat) || isNaN(lng)) return;
      partners.push({
        id: el.getAttribute('data-partner-id'),
        name: el.getAttribute('data-partner-name') || '',
        logo: el.getAttribute('data-partner-logo') || '',
        url: el.getAttribute('data-partner-url') || '',
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
    return (
      '<div class="partner-map-popup">' +
      logoBlock +
      '<p class="partner-map-popup-name">' +
      escapeHtml(partner.name) +
      '</p>' +
      '<a class="partner-map-popup-link" href="' +
      escapeAttr(siteUrl) +
      '" target="_blank" rel="noopener">Visit website</a>' +
      '</div>'
    );
  }

  function createDotIcon(active) {
    return L.divIcon({
      className: 'partner-map-dot-wrap' + (active ? ' partner-map-dot-wrap--active' : ''),
      html: '<span class="partner-map-dot" aria-hidden="true"></span>',
      iconSize: active ? [18, 18] : [14, 14],
      iconAnchor: active ? [9, 9] : [7, 7],
      popupAnchor: [0, active ? -10 : -8],
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
    var dotIcon = createDotIcon(false);
    var dotIconActive = createDotIcon(true);

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
      minZoom: 5,
      maxZoom: 12,
      maxBounds: CA_BOUNDS.pad(0.05),
      maxBoundsViscosity: 0.85,
    });

    var tileLayer = L.tileLayer(tileUrl(), {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.fitBounds(CA_BOUNDS, { padding: [32, 32] });

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

    function centerOnMarker(marker, thenOpenPopup) {
      var latlng = marker.getLatLng();
      var zoom = Math.max(map.getZoom(), 8);

      map.flyTo(latlng, zoom, { animate: true, duration: 0.45 });

      map.once('moveend', function onFlyEnd() {
        map.off('moveend', onFlyEnd);
        if (!thenOpenPopup) return;
        positionMarkerInMapFrame(marker, function () {
          marker.openPopup();
        });
      });
    }

    function scrollToMap(callback) {
      var mapEl =
        document.querySelector('.partner-map-wrapper') ||
        document.getElementById('partner-map-canvas');
      if (mapEl) {
        mapEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
      window.setTimeout(function () {
        map.invalidateSize();
        if (callback) callback();
      }, 500);
    }

    function setMarkerIcons() {
      Object.keys(markersById).forEach(function (id) {
        markersById[id].setIcon(id === activeId ? dotIconActive : dotIcon);
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

      document.querySelectorAll('.logo-item[data-partner-id]').forEach(function (el) {
        el.classList.toggle('logo-item--active', el.getAttribute('data-partner-id') === id);
      });

      if (options.fly !== false) {
        centerOnMarker(marker, true);
      } else {
        positionMarkerInMapFrame(marker, function () {
          marker.openPopup();
        });
      }
    }

    partners.forEach(function (partner) {
      var marker = L.marker([partner.lat, partner.lng], { icon: dotIcon }).addTo(map);

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

    document.querySelectorAll('.logo-item[data-partner-id]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var id = el.getAttribute('data-partner-id');
        scrollToMap(function () {
          openPartner(id, { fly: true });
        });
      });
    });

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
