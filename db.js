(function(){
    const DB_NAME = 'pingpontoDb';
    const DB_VER = 2;

    function openDb(){
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = e => {
          const db = e.target.result;

          if(!db.objectStoreNames.contains('employees')){
            const s = db.createObjectStore('employees', { keyPath:'id', autoIncrement:true });
            s.createIndex('by_name','name',{unique:false});
          }
          if(!db.objectStoreNames.contains('punches')){
            const p = db.createObjectStore('punches', { keyPath:'id', autoIncrement:true });
            p.createIndex('by_emp','employeeId',{unique:false});
            p.createIndex('by_ts','ts',{unique:false});
          }
          if(!db.objectStoreNames.contains('meta')){
            db.createObjectStore('meta', { keyPath:'key' });
          }

          if(!db.objectStoreNames.contains('managers')){
            const m = db.createObjectStore('managers', { keyPath:'id', autoIncrement:true });
            m.createIndex('by_name','name',{unique:false});
          }
        };

        req.onsuccess = e => {
          const db = e.target.result;
          ensureDefaultManager(db).then(() => resolve(db)).catch(reject);
        };
        req.onerror = () => reject(req.error);
      });
    }

    function storeTx(store, mode){
      return openDb().then(db => db.transaction(store, mode).objectStore(store));
    }
    function put(store, value){
      return storeTx(store, 'readwrite').then(s => new Promise((res, rej) => {
        const r = s.put(value); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      }));
    }
    function add(store, value){
      return storeTx(store, 'readwrite').then(s => new Promise((res, rej) => {
        const r = s.add(value); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      }));
    }
    function del(store, key){
      return storeTx(store, 'readwrite').then(s => new Promise((res, rej) => {
        const r = s.delete(key); r.onsuccess = () => res(true); r.onerror = () => rej(r.error);
      }));
    }
    function get(store, key){
      return storeTx(store, 'readonly').then(s => new Promise((res, rej) => {
        const r = s.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      }));
    }
    function getAll(store){
      return storeTx(store, 'readonly').then(s => new Promise((res, rej) => {
        const r = s.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
      }));
    }

    function hashPin(pin){
      let h = 0; for(let i=0;i<pin.length;i++){ h = ((h<<5)-h) + pin.charCodeAt(i); h|=0; }
      return String(h);
    }

    function tx(db, stores, mode){
      return db.transaction(stores, mode);
    }

    function getFromStore(store, key){
      return new Promise((res, rej) => {
        const r = store.get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }

    function getAllFromStore(store){
      return new Promise((res, rej) => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    }

    function addToStore(store, value){
      return new Promise((res, rej) => {
        const r = store.add(value);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }

    function putToStore(store, value){
      return new Promise((res, rej) => {
        const r = store.put(value);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }

    function ensureDefaultManager(db){
      if(!db.objectStoreNames.contains('managers')){
        return Promise.resolve();
      }
      const t = tx(db, ['managers','meta'], 'readwrite');
      const managers = t.objectStore('managers');
      const meta = t.objectStore('meta');

      return getAllFromStore(managers).then(list => {
        if(list.length){
          return true;
        }
        return getFromStore(meta, 'managerPin').then(v => {
          const legacyHash = v ? v.value : null;
          const pinHash = legacyHash || hashPin('123456');
          return addToStore(managers, { name: 'Gestor', pinHash, active: true });
        });
      });
    }

    window.pingpontoDb = {
      addEmployee(name, pin){ return add('employees', { name, pinHash:hashPin(pin), active:true }); },
      listEmployees(){ return getAll('employees'); },
      removeEmployee(id){ return del('employees', id); },
      setEmployeeActive(emp, active){ emp.active = active; return put('employees', emp); },
      authEmployee(id, pin){
        return get('employees', id).then(emp => {
          if(!emp) return null;
          return hashPin(pin) === emp.pinHash ? emp : null;
        });
      },

      addManager(name, pin){ return add('managers', { name, pinHash:hashPin(pin), active:true }); },
      listManagers(){ return getAll('managers'); },
      removeManager(id){ return del('managers', id); },
      setManagerActive(mgr, active){ mgr.active = active; return put('managers', mgr); },
      setManagerPin(managerId, pin){
        return get('managers', managerId).then(mgr => {
          if(!mgr) return false;
          mgr.pinHash = hashPin(pin);
          return put('managers', mgr).then(() => true);
        });
      },
      authManager(managerId, pin){
        return get('managers', managerId).then(mgr => {
          if(!mgr || !mgr.active) return null;
          return hashPin(pin) === mgr.pinHash ? mgr : null;
        });
      },

      addPunch(employeeId, type, ts){ return add('punches', { employeeId, type, ts }); },
      listPunchesByEmpAndRange(employeeId, from, to){
        return storeTx('punches', 'readonly').then(s => new Promise((res, rej) => {
          const req = s.openCursor();
          const out = [];
          req.onsuccess = e => {
            const c = e.target.result;
            if(c){
              const v = c.value;
              if(v.employeeId === employeeId && v.ts >= from && v.ts <= to){ out.push(v); }
              c.continue();
            } else {
              out.sort((a,b) => a.ts - b.ts);
              res(out);
            }
          };
          req.onerror = () => rej(req.error);
        }));
      }
    };
  })();
