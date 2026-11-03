/* طبقة البيانات: Firebase لو الإعدادات موجودة، وإلا وضع تجريبي (localStorage) */
(function () {
  var C = window.BEKACH_CONFIG || {};
  var demo = !C.firebase || !C.firebase.apiKey || String(C.firebase.apiKey).indexOf("PASTE") === 0 || typeof firebase === "undefined";

  var SEED = [
    ["01055942436","Karim S","vc"],["01055942417","Karim S","vc"],["01042073401","Karim S","vc"],
    ["01055366519","Mohamed S","vc"],["01055164733","Mohamed S","vc"],["01008137806","Sarwat A","ip"],
    ["01035826232","Aya s m","vc"],["01035895030","Aya s m","vc"],["01024688189","Sarwat A","vc"],
    ["01018364785","Azza M","vc"],["01013084346","Azza M","vc"],["01043592335","Ziad I","vc"],
    ["01043599128","Ziad I","vc"],["01031038143","MYSORE G","vc"],["01097790697","MYSORE G","vc"],
    ["01070435675","Irigy M","vc"],["01070638271","Irigy M","vc"]
  ].map(function (r, i) { return { num: r[0], name: r[1], type: r[2], order: i }; });

  var impl;

  if (!demo) {
    firebase.initializeApp(C.firebase);
    var fs = firebase.firestore(), auth = firebase.auth();
    impl = {
      onNumbers: function (cb, err) {
        return fs.collection("numbers").orderBy("order").onSnapshot(function (s) {
          cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
        }, err || console.error);
      },
      addNumber: function (n) { return fs.collection("numbers").add(Object.assign({ order: Date.now() }, n)); },
      updateNumber: function (id, n) { return fs.collection("numbers").doc(id).update(n); },
      deleteNumber: function (id) { return fs.collection("numbers").doc(id).delete(); },
      seed: function () { var b = fs.batch(); SEED.forEach(function (n) { b.set(fs.collection("numbers").doc(), n); }); return b.commit(); },
      logTx: function (tx) { return fs.collection("transactions").add(Object.assign({}, tx, { ts: firebase.firestore.FieldValue.serverTimestamp() })); },
      onTx: function (sinceMs, cb, err) {
        return fs.collection("transactions").where("ts", ">=", new Date(sinceMs)).orderBy("ts", "desc").onSnapshot(function (s) {
          cb(s.docs.map(function (d) { var x = d.data(); return Object.assign({ id: d.id }, x, { ts: x.ts ? x.ts.toMillis() : Date.now() }); }));
        }, err || console.error);
      },
      login: function (pw) { return auth.signInWithEmailAndPassword(C.ownerEmail, pw); },
      logout: function () { return auth.signOut(); },
      onAuth: function (cb) { return auth.onAuthStateChanged(function (u) { cb(!!u); }); }
    };
  } else {
    var mem = {};
    var store = {
      get: function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return mem[k] || null; } },
      set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
    };
    var L = { bk_numbers: [], bk_tx: [], auth: [] };
    var fire = function (k) { (L[k] || []).forEach(function (f) { f(); }); };
    window.addEventListener("storage", function (e) { if (e.key === "bk_numbers" || e.key === "bk_tx") fire(e.key); });
    var nums = function () { var v = store.get("bk_numbers"); if (!v) { v = SEED.map(function (n, i) { return Object.assign({ id: "s" + i }, n); }); store.set("bk_numbers", v); } return v; };
    var DEMO_PW = "demo1234";
    impl = {
      onNumbers: function (cb) { var f = function () { cb(nums().slice().sort(function (a, b) { return a.order - b.order; })); }; L.bk_numbers.push(f); f(); return function () {}; },
      addNumber: function (n) { var v = nums(); v.push(Object.assign({ id: "n" + Date.now(), order: Date.now() }, n)); store.set("bk_numbers", v); fire("bk_numbers"); return Promise.resolve(); },
      updateNumber: function (id, n) { var v = nums().map(function (x) { return x.id === id ? Object.assign({}, x, n) : x; }); store.set("bk_numbers", v); fire("bk_numbers"); return Promise.resolve(); },
      deleteNumber: function (id) { store.set("bk_numbers", nums().filter(function (x) { return x.id !== id; })); fire("bk_numbers"); return Promise.resolve(); },
      seed: function () { store.set("bk_numbers", SEED.map(function (n, i) { return Object.assign({ id: "s" + i }, n); })); fire("bk_numbers"); return Promise.resolve(); },
      logTx: function (tx) { var v = store.get("bk_tx") || []; v.push(Object.assign({ id: "t" + Date.now() + Math.random(), ts: Date.now() }, tx)); store.set("bk_tx", v); fire("bk_tx"); return Promise.resolve(); },
      onTx: function (since, cb) { var f = function () { cb((store.get("bk_tx") || []).filter(function (t) { return t.ts >= since; }).sort(function (a, b) { return b.ts - a.ts; })); }; L.bk_tx.push(f); f(); return function () {}; },
      login: function (pw) { if (pw === DEMO_PW) { try { sessionStorage.setItem("bk_auth", "1"); } catch (e) {} fire("auth"); return Promise.resolve(); } return Promise.reject({ code: "auth/wrong-password" }); },
      logout: function () { try { sessionStorage.removeItem("bk_auth"); } catch (e) {} fire("auth"); return Promise.resolve(); },
      onAuth: function (cb) { var f = function () { var ok = false; try { ok = sessionStorage.getItem("bk_auth") === "1"; } catch (e) {} cb(ok); }; L.auth.push(f); f(); return function () {}; }
    };
  }
  impl.demo = demo;
  impl.SEED = SEED;
  window.DB = impl;
})();
