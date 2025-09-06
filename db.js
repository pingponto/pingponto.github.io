(function(){
    var DB_NAME = 'pingpontoDb';
    var DB_VER = 1;
    function openDb(){
    return new Promise(function(resolve, reject){
    var req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = function(e){
    var db = e.target.result;
    if(!db.objectStoreNames.contains('employees')){
    var s = db.createObjectStore('employees', { keyPath:'id', autoIncrement:true });
    s.createIndex('by_name','name',{unique:false});
    }
    if(!db.objectStoreNames.contains('punches')){
    var p = db.createObjectStore('punches', { keyPath:'id', autoIncrement:true });
    p.createIndex('by_emp','employeeId',{unique:false});
    p.createIndex('by_ts','ts',{unique:false});
    }
    if(!db.objectStoreNames.contains('meta')){
    db.createObjectStore('meta', { keyPath:'key' });
    }
    };
    req.onsuccess = function(e){ resolve(e.target.result); };
    req.onerror = function(){ reject(req.error); };
    });
    }
    function tx(store, mode){ return openDb().then(function(db){ return db.transaction(store, mode).objectStore(store); }); }
    function put(store, value){ return tx(store, 'readwrite').then(function(s){ return new Promise(function(res, rej){ var r = s.put(value); r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)}; }); }); }
    function add(store, value){ return tx(store, 'readwrite').then(function(s){ return new Promise(function(res, rej){ var r = s.add(value); r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)}; }); }); }
    function del(store, key){ return tx(store, 'readwrite').then(function(s){ return new Promise(function(res, rej){ var r = s.delete(key); r.onsuccess=function(){res(true)}; r.onerror=function(){rej(r.error)}; }); }); }
    function all(store){ return tx(store, 'readonly').then(function(s){ return new Promise(function(res, rej){ var a=[]; var r = s.openCursor(); r.onsuccess=function(e){ var c=e.target.result; if(c){ a.push(c.value); c.continue(); } else res(a); }; r.onerror=function(){ rej(r.error); }; }); }); }
    function get(store, key){ return tx(store, 'readonly').then(function(s){ return new Promise(function(res, rej){ var r = s.get(key); r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)}; }); }); }
    function hashPin(pin){
    var h = 0; for(var i=0;i<pin.length;i++){ h = ((h<<5)-h) + pin.charCodeAt(i); h|=0; } return String(h);
    }
    window.pingpontoDb = {
    addEmployee: function(name, pin){ return add('employees',{ name:name, pinHash:hashPin(pin), active:true }); },
    listEmployees: function(){ return all('employees'); },
    removeEmployee: function(id){ return del('employees', id); },
    setEmployeeActive: function(emp, active){ emp.active=active; return put('employees', emp); },
    authEmployee: function(id, pin){ return get('employees', id).then(function(emp){ if(!emp||!emp.active) return null; return hashPin(pin)===emp.pinHash? emp:null; }); },
    authManager: function(pin){ return get('meta','managerPin').then(function(v){ var hv = v? v.value: '0'; return hashPin(pin)===hv; }); },
    setManagerPin: function(pin){ return put('meta', { key:'managerPin', value:hashPin(pin) }); },
    addPunch: function(employeeId, type, ts){ return add('punches',{ employeeId:employeeId, type:type, ts:ts }); },
    listPunchesByEmpAndRange: function(employeeId, from, to){ return openDb().then(function(db){ return new Promise(function(res, rej){ var s=db.transaction('punches','readonly').objectStore('punches').index('by_emp'); var range=IDBKeyRange.only(employeeId); var out=[]; var req=s.openCursor(range); req.onsuccess=function(e){ var c=e.target.result; if(c){ var v=c.value; if(v.ts>=from && v.ts<=to) out.push(v); c.continue(); } else { out.sort(function(a,b){return a.ts-b.ts}); res(out); } }; req.onerror=function(){ rej(req.error); }; }); }); }
    };
    })();