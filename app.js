(function(){
    td4.appendChild(btnAct); td4.appendChild(btnDel); tr.appendChild(td4);
    t.appendChild(tr);
    });
    });
    }
    
    
    function buildCsv(rows){
    var s = 'id,employeeId,type,timestamp\n';
    rows.forEach(function(r){ s += [r.id, r.employeeId, r.type, new Date(r.ts).toISOString()].join(',')+'\n'; });
    return s;
    }
    
    
    function doReport(doc){
    var empSel = doc.getElementById('reportEmp');
    var df = doc.getElementById('dateFrom');
    var dt = doc.getElementById('dateTo');
    var tbl = doc.getElementById('reportTable');
    var btn = doc.getElementById('btnReport');
    var csv = doc.getElementById('btnCsv');
    btn.onclick = function(){
    var id = parseInt(empSel.value,10);
    var from = df.value? new Date(df.value+'T00:00:00').getTime(): 0;
    var to = dt.value? new Date(dt.value+'T23:59:59').getTime(): Date.now();
    window.pontualDb.listPunchesByEmpAndRange(id, from, to).then(function(rows){
    tbl.innerHTML='';
    var head = doc.createElement('tr'); ['Data/Hora','Tipo'].forEach(function(h){ var th=doc.createElement('th'); th.textContent=h; head.appendChild(th); }); tbl.appendChild(head);
    rows.forEach(function(r){ var tr=doc.createElement('tr'); var td1=doc.createElement('td'); td1.textContent=fmtTs(r.ts); var td2=doc.createElement('td'); td2.textContent=r.type; tr.appendChild(td1); tr.appendChild(td2); tbl.appendChild(tr); });
    csv.onclick=function(){ var blob=new Blob([buildCsv(rows)],{type:'text/csv'}); var url=URL.createObjectURL(blob); var a=doc.createElement('a'); a.href=url; a.download='espelho.csv'; a.click(); URL.revokeObjectURL(url); };
    });
    };
    }
    
    
    function ensureManagerPin(){
    return window.pontualDb.authManager('000000').then(function(ok){
    if(ok) return true; return window.pontualDb.setManagerPin('123456');
    });
    }
    
    
    function mountManager(){
    hide(loginSection); hide(employeeSection); show(managerSection);
    renderEmpTable();
    reloadEmployees($('reportEmp'));
    $('addEmp').onclick = function(){ var n=$('newEmpName').value.trim(); var p=$('newEmpPin').value.trim(); if(!n||!p) return; window.pontualDb.addEmployee(n,p).then(function(){ $('newEmpName').value=''; $('newEmpPin').value=''; renderEmpTable(); reloadEmployees($('reportEmp')); reloadEmployees(employeeSelect); }); };
    $('btnReport').onclick = function(){ doReport(document); };
    $('btnCsv').onclick = function(){ doReport(document); };
    $('managerLogout').onclick = function(){ show(loginSection); hide(managerSection); };
    }
    
    
    function mountLogin(){
    mountTabs();
    reloadEmployees(employeeSelect);
    $('employeeEnter').onclick = function(){ var id=parseInt(employeeSelect.value,10); var pin=employeePin.value; window.pontualDb.authEmployee(id, pin).then(function(emp){ if(emp){ mountEmployee(emp); } else { alert('PIN inválido'); } }); };
    $('managerEnter').onclick = function(){ var pin=managerPin.value; window.pontualDb.authManager(pin).then(function(ok){ if(ok){ mountManager(); } else { alert('PIN do gestor inválido'); } }); };
    }
    
    
    window.pontual = {
    mountReport: function(doc){ reloadEmployees(doc.getElementById('reportEmp')).then(function(){ doReport(doc); }); }
    };
    
    
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
    ensureManagerPin().then(mountLogin);
    })();