(function () {
  var $ = function (id) { return document.getElementById(id); };

  var loginSection = $("loginSection");
  var employeeSection = $("employeeSection");
  var managerSection = $("managerSection");
  var employeeSelect = $("employeeSelect");
  var employeePin = $("employeePin");
  var managerPin = $("managerPin");
  var empName = $("empName");
  var lastPunch = $("lastPunch");
  var tabEmployee = $("tabEmployee");
  var tabManager = $("tabManager");

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function setActive(tab, active) { active ? tab.classList.add("active") : tab.classList.remove("active"); }

  // Utilitários de data/hora
  function startOfDay(ts){ var d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
  function endOfDay(ts){ var d=new Date(ts); d.setHours(23,59,59,999); return d.getTime(); }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function hhmm(ts){
    var d = new Date(ts);
    return pad2(d.getHours())+":"+pad2(d.getMinutes());
  }

  // Recarrega colaboradores nos <select>
  function reloadEmployees(select) {
    return window.pingpontoDb.listEmployees().then(function (list) {
      select.innerHTML = "";
      list.filter(function (e) { return e.active; })
        .forEach(function (e) {
          var o = document.createElement("option");
          o.value = e.id;
          o.textContent = e.name;
          select.appendChild(o);
        });
      if (!list.length) {
        return window.pingpontoDb.addEmployee("Funcionário 1", "111111")
          .then(function () { return reloadEmployees(select); });
      }
    });
  }

  // Abas login Funcionário/Gestor
  function mountTabs() {
    tabEmployee.addEventListener("click", function () {
      setActive(tabEmployee, true);
      setActive(tabManager, false);
      $("employeeLogin").classList.remove("hidden");
      $("managerLogin").classList.add("hidden");
    });
    tabManager.addEventListener("click", function () {
      setActive(tabEmployee, false);
      setActive(tabManager, true);
      $("employeeLogin").classList.add("hidden");
      $("managerLogin").classList.remove("hidden");
    });
  }

  // Tela do funcionário
  function mountEmployee(loginEmp) {
    hide(loginSection);
    hide(managerSection);
    show(employeeSection);
    empName.textContent = loginEmp.name;
    lastPunch.textContent = "";

    var btn = document.getElementById("btnRegistrar");
    if (btn) {
      btn.onclick = function () {
        var ts = Date.now();
        // Armazena um clique simples (sem etapas/tipos visíveis)
        // Mantemos o campo "type" como "CLICK" apenas para compatibilidade interna,
        // mas o relatório não usa esse campo para nada.
        window.pingpontoDb.addPunch(loginEmp.id, "CLICK", ts).then(function () {
          lastPunch.textContent = "Ponto registrado às " + hhmm(ts);
        });
      };
    }

    $("employeeLogout").onclick = function () {
      show(loginSection);
      hide(employeeSection);
    };
  }

  // Tabela de colaboradores no painel do gestor
  function renderEmpTable() {
    var t = $("empTable");
    t.innerHTML = "";
    window.pingpontoDb.listEmployees().then(function (list) {
      var head = document.createElement("tr");
      ["ID", "Nome", "Ativo", "Ações"].forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        head.appendChild(th);
      });
      t.appendChild(head);

      list.forEach(function (e) {
        var tr = document.createElement("tr");

        var td1 = document.createElement("td"); td1.textContent = e.id; tr.appendChild(td1);
        var td2 = document.createElement("td"); td2.textContent = e.name; tr.appendChild(td2);
        var td3 = document.createElement("td"); td3.textContent = e.active ? "Sim" : "Não"; tr.appendChild(td3);

        var td4 = document.createElement("td");
        var btnAct = document.createElement("button");
        btnAct.textContent = e.active ? "Desativar" : "Ativar";
        btnAct.onclick = function () {
          window.pingpontoDb.setEmployeeActive(e, !e.active)
            .then(renderEmpTable)
            .then(function () {
              reloadEmployees($("reportEmp"));
              reloadEmployees(employeeSelect);
            });
        };
        var btnDel = document.createElement("button");
        btnDel.textContent = "Excluir";
        btnDel.onclick = function () {
          window.pingpontoDb.removeEmployee(e.id)
            .then(renderEmpTable)
            .then(function () {
              reloadEmployees($("reportEmp"));
              reloadEmployees(employeeSelect);
            });
        };
        td4.appendChild(btnAct);
        td4.appendChild(btnDel);
        tr.appendChild(td4);

        t.appendChild(tr);
      });
    });
  }

  // Relatório mensal deduzido por cliques
  // Regras:
  // - 2 cliques (entrada/intervalo) => total = t2 - t1 (OK)
  // - 4 cliques (volta/saída) => total = (t2 - t1) + (t4 - t3) (OK)
  // - nº ímpar de cliques => "Irregular" (soma apenas pares completos)
  // - >4 cliques => "Inconsistente" (soma pares completos, mas marca inconsistente)
  function doReport(doc) {
    var empSel = doc.getElementById("reportEmp");
    var month = doc.getElementById("reportMonth");
    var tbl = doc.getElementById("reportTable");
    var btn = doc.getElementById("btnReport");
    var csv = doc.getElementById("btnCsv");

    function monthRange(ym) {
      if (!ym || !ym.value) return null;
      var parts = ym.value.split("-");
      var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
      var from = new Date(y, m, 1, 0, 0, 0, 0).getTime();
      var to = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
      return { from: from, to: to };
    }

    function minutes(ms) { return Math.floor(ms / 60000); }
    function hhmmFromMinutes(min) {
      var h = Math.floor(min / 60);
      var m = min % 60;
      return pad2(h) + ":" + pad2(m);
    }

    function groupByDay(list) {
      var map = {};
      list.forEach(function(p){
        var dayKey = startOfDay(p.ts);
        (map[dayKey] = map[dayKey] || []).push(p.ts);
      });
      // Ordena timestamps em cada dia
      Object.keys(map).forEach(function(k){ map[k].sort(function(a,b){return a-b;}); });
      return map;
    }

    function computeDay(clicks) {
      var totalMs = 0;
      for (var i = 0; i + 1 < clicks.length; i += 2) {
        totalMs += (clicks[i + 1] - clicks[i]);
      }
      var n = clicks.length;
      var status = "OK";
      if (n === 0) status = "Sem registros";
      else if (n > 4) status = "Inconsistente";
      else if (n % 2 === 1) status = "Irregular";
      return { totalMin: minutes(totalMs), status: status };
    }

    function render() {
      var empId = parseInt(empSel.value, 10);
      var r = monthRange(month);
      if (!empId || !r) {
        tbl.innerHTML = "<tr><td>Selecione um mês e um colaborador</td></tr>";
        return;
      }
      window.pingpontoDb.listPunchesByEmpAndRange(empId, r.from, r.to).then(function (list) {
        var byDay = groupByDay(list);
        var dayKeys = Object.keys(byDay).map(function(k){return parseInt(k,10);}).sort(function(a,b){return a-b;});

        var rows = ["<tr><th>Data</th><th>Horários</th><th>Total trabalhado</th><th>Status</th></tr>"];
        var csvLines = ["data;horarios;total_trabalhado;status"];

        dayKeys.forEach(function(dayKey){
          var clicks = byDay[dayKey];
          var d = new Date(dayKey);
          var dataStr = d.toLocaleDateString('pt-BR');
          var horarios = clicks.map(hhmm).join("  •  ");
          var comp = computeDay(clicks);
          var totalStr = hhmmFromMinutes(comp.totalMin);
          rows.push("<tr><td>"+dataStr+"</td><td>"+horarios+"</td><td>"+totalStr+"</td><td>"+comp.status+"</td></tr>");
          csvLines.push([dataStr, horarios, totalStr, comp.status].join(";"));
        });

        if (dayKeys.length === 0) {
          rows = ["<tr><td>Nenhum registro no mês selecionado.</td></tr>"];
        }

        tbl.innerHTML = rows.join("");

        csv.onclick = function(){
          var blob = new Blob([csvLines.join("\n")], {type:"text/csv;charset=utf-8;"});
          var url = URL.createObjectURL(blob);
          var a = doc.createElement("a");
          a.href = url; a.download = "relatorio.csv";
          a.click(); URL.revokeObjectURL(url);
        };
      });
    }

    btn.onclick = render;
    month.onchange = function(){};
    window.pingpontoDb.listEmployees().then(function(list){
      empSel.innerHTML = list.map(function(e){ return "<option value='"+e.id+"'>"+e.name+"</option>"; }).join("");
    });
  }

  function ensureManagerPin() {
    return window.pingpontoDb.authManager("000000").then(function (ok) {
      if (ok) return true;
      return window.pingpontoDb.setManagerPin("123456");
    });
  }

  function mountManager() {
    hide(loginSection);
    hide(employeeSection);
    show(managerSection);
    renderEmpTable();
    reloadEmployees($("reportEmp"));

    $("addEmp").onclick = function () {
      var n = $("newEmpName").value.trim();
      var p = $("newEmpPin").value.trim();
      if (!n || !p) return;
      window.pingpontoDb.addEmployee(n, p).then(function () {
        $("newEmpName").value = "";
        $("newEmpPin").value = "";
        renderEmpTable();
        reloadEmployees($("reportEmp"));
        reloadEmployees(employeeSelect);
      });
    };

    $("btnReport").onclick = function () { doReport(document); };
    $("btnCsv").onclick = function () { doReport(document); };

    $("managerLogout").onclick = function () {
      show(loginSection);
      hide(managerSection);
    };
  }

  function mountLogin() {
    mountTabs();
    reloadEmployees(employeeSelect);

    $("employeeEnter").onclick = function () {
      var id = parseInt(employeeSelect.value, 10);
      var pin = employeePin.value;
      window.pingpontoDb.authEmployee(id, pin).then(function (emp) {
        if (emp) { mountEmployee(emp); }
        else { alert("PIN inválido"); }
      });
    };

    $("managerEnter").onclick = function () {
      var pin = managerPin.value;
      window.pingpontoDb.authManager(pin).then(function (ok) {
        if (ok) { mountManager(); }
        else { alert("PIN do gestor inválido"); }
      });
    };
  }

  // Exposto para report.html
  window.pingponto = {
    mountReport: function (doc) {
      reloadEmployees(doc.getElementById("reportEmp")).then(function () {
        // Apenas garante que o <select> tenha opções
      });
      // O doReport no report.html chama a própria função do app ao clicar
      // mas deixamos essa API para compatibilidade.
    },
    // Para reaproveitar as funções se necessário no report.html no futuro:
    // nada adicional aqui por enquanto
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
  ensureManagerPin().then(mountLogin);
})();
