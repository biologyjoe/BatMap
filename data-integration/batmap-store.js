// batmap-store.js — the ONE place the website gets its data from.
//
// Today it reads the static files in data/ (built by database/build_data.py).
// When BatMap moves to a server, rewrite load() to fetch from the API and
// return the same shapes. No page component needs to change.
//
// After load() resolves, everything is on window.BatMap:
//   BatMap.meta            build date, source files
//   BatMap.species         [{ id, common, color }]
//   BatMap.speciesById     { id: species }
//   BatMap.bridges         [{ sfn, lat, lon, road, feature, county, district, ... , surveys:[], speciesFound:[] }]
//   BatMap.bridgeBySfn     { sfn: bridge }
//   BatMap.surveyedBridges bridges with at least one bat survey
//   BatMap.surveys         [{ sfn, type, date, year, batsSeen, species:[ids], idMethod, speciesText }]
//   BatMap.captures        [{ date, year, month, species, age, sex, repro, forearm, mass, band, project }]
//   BatMap.projects        [{ name, records, first, last, lat, lon }]
//   BatMap.colorFor(id)    species color
//   BatMap.nameFor(id)     species common name
(function () {
  "use strict";

  function decode(table, code) {
    if (code === null || code === undefined || code === "") return null;
    var key = String(code);
    return (table && table[key]) || "Code " + key;
  }

  function fromDict(list, i) {
    return i === -1 || i === null || i === undefined ? null : list[i];
  }

  function buildFromRaw(raw) {
    var L = raw.lookups, B = raw.bridges, S = raw.surveys, C = raw.captures;
    var codes = L.codes;

    // species
    var species = L.species.slice();
    var speciesById = {};
    species.forEach(function (s) { speciesById[s.id] = s; });

    // bridges (columnar -> objects)
    var bc = B.cols, bd = B.dict, n = bc.sfn.length;
    var bridges = new Array(n), bridgeBySfn = {};
    for (var i = 0; i < n; i++) {
      var b = {
        sfn: bc.sfn[i],
        lat: bc.lat[i],
        lon: bc.lon[i],
        road: fromDict(bd.road, bc.road[i]),
        feature: fromDict(bd.feature, bc.feature[i]),
        county: fromDict(bd.county, bc.county[i]),
        district: bc.district[i],
        routeOwner: decode(codes.owner, bc.owner[i]),
        occurrenceRank: fromDict(bd.rank, bc.rank[i]),
        material: decode(codes.material, bc.material[i]),
        designType: decode(codes.design, bc.design[i]),
        yearBuilt: bc.year[i],
        serviceOn: decode(codes.svcOn, bc.svcOn[i]),
        serviceUnder: decode(codes.svcUnder, bc.svcUnder[i]),
        maintainedBy: decode(codes.maint, bc.maint[i]),
        maintainedByB: decode(codes.maintB, bc.maintB[i]),
        length: bc.length[i],
        deckArea: bc.deck[i],
        mainMember: decode(codes.member, bc.member[i]),
        coordStatus: ["ok", "sign fixed", "outside Ohio"][bc.coord[i]] || "ok",
        surveys: [],
        speciesFound: [],
        batsFound: false,
        lastSurvey: null,
      };
      bridges[i] = b;
      bridgeBySfn[b.sfn] = b;
    }

    // surveys
    var sf = S.fields, sd = S.dict;
    var surveys = S.rows.map(function (r) {
      var o = {};
      sf.forEach(function (f, k) { o[f] = r[k]; });
      o.type = fromDict(sd.type, o.type);
      o.idMethod = fromDict(sd.idMethod, o.idMethod);
      o.species = o.species.map(function (k) { return species[k].id; });
      o.year = o.date ? +o.date.slice(0, 4) : null;
      var b = bridgeBySfn[o.sfn];
      if (b) {
        b.surveys.push(o);
        o.species.forEach(function (sp) { if (b.speciesFound.indexOf(sp) < 0) b.speciesFound.push(sp); });
        if (o.species.length) b.batsFound = true;
        if (o.date && (!b.lastSurvey || o.date > b.lastSurvey)) b.lastSurvey = o.date;
      }
      return o;
    });
    bridges.forEach(function (b) {
      if (b.surveys.length > 1) b.surveys.sort(function (x, y) { return (x.date || "") < (y.date || "") ? -1 : 1; });
    });
    var surveyedBridges = bridges.filter(function (b) { return b.surveys.length > 0; });

    // captures
    var cc = C.cols, cd = C.dict, m = cc.date.length;
    var captures = new Array(m);
    var projRows = C.projects.rows;
    for (var j = 0; j < m; j++) {
      var d = cc.date[j];
      captures[j] = {
        date: d,
        year: d ? +d.slice(0, 4) : null,
        month: d ? +d.slice(5, 7) : null,
        species: species[cc.species[j]].id,
        age: fromDict(cd.age, cc.age[j]),
        sex: fromDict(cd.sex, cc.sex[j]),
        repro: fromDict(cd.repro, cc.repro[j]),
        forearm: cc.forearm[j],
        mass: cc.mass[j],
        band: fromDict(cd.band, cc.band[j]),
        project: cc.project[j] === -1 ? null : projRows[cc.project[j]][0],
      };
      if (cc.surveyor) captures[j].surveyor = fromDict(cd.surveyor, cc.surveyor[j]);
      if (cc.bandId) captures[j].bandId = cc.bandId[j];
    }
    var pf = C.projects.fields;
    var projects = projRows.map(function (r) {
      var o = {};
      pf.forEach(function (f, k) { o[f] = r[k]; });
      return o;
    });

    return {
      meta: L.meta,
      species: species,
      speciesById: speciesById,
      bridges: bridges,
      bridgeBySfn: bridgeBySfn,
      surveyedBridges: surveyedBridges,
      surveys: surveys,
      captures: captures,
      projects: projects,
      colorFor: function (id) { return (speciesById[id] && speciesById[id].color) || "#94a3b8"; },
      nameFor: function (id) { return (speciesById[id] && speciesById[id].common) || id || "Unknown"; },
    };
  }

  function load() {
    // Static version: data/*.js already ran and filled window.BATMAP_RAW.
    // Server version later: return fetch("/api/...").then(r => r.json()).then(...)
    return new Promise(function (resolve, reject) {
      var raw = window.BATMAP_RAW || {};
      var missing = ["lookups", "bridges", "surveys", "captures"].filter(function (k) { return !raw[k]; });
      if (missing.length) {
        reject(new Error("Missing data files: " + missing.join(", ") + ". Run database/build_data.py."));
        return;
      }
      try {
        window.BatMap = buildFromRaw(raw);
        resolve(window.BatMap);
      } catch (e) {
        reject(e);
      }
    });
  }

  // CSV export helper used by the Data Portal
  function toCSV(rows, columns) {
    var esc = function (v) {
      if (v === null || v === undefined) return "";
      var s = Array.isArray(v) ? v.join("; ") : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var head = columns.map(function (c) { return esc(c.label); }).join(",");
    var body = rows.map(function (r) {
      return columns.map(function (c) { return esc(c.csv ? c.csv(r) : r[c.key]); }).join(",");
    });
    return [head].concat(body).join("\n");
  }

  function downloadCSV(filename, rows, columns) {
    var blob = new Blob(["﻿" + toCSV(rows, columns)], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  window.BatMapStore = { load: load, toCSV: toCSV, downloadCSV: downloadCSV };
})();
