(function () {
    var $ = function (id) {
      return document.getElementById(id);
    };
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
  
    function show(el) {
      el.classList.remove("hidden");
    }
    function hide(el) {
      el.classList.add("hidden");
    }
    function setActive(tab, active) {
      if (active) tab.classList.add("active");
      else tab.classList.remove("active");
    }
    function fmtTs(ts) {
      var d = new Date(ts);
      var p = (n) => (n < 10 ? "0" + n : n);
      return (
        d.getFullYear() +
        "-" +
        p(d.getMonth() + 1) +
        "-" +
        p(d.getDate()) +
        " " +
        p(d.getHours()) +
        ":" +
        p(d.getMinutes())
      );
    }
  
    function reloadEmployees(select) {
      return window.pingpontoDb.listEmployees().then(function (list) {
        select.innerHTML = "";
        list
          .filter(function (e) {
            return e.active;
          })
          .forEach(function (e) {
            var o = document.createElement("option");
            o.value = e.id;
            o.textContent = e.name;
            select.appendChild(o);
          });
        if (!list.length) {
          return window.pingpontoDb
            .addEmployee("Funcionário 1", "111111")
            .then(function () {
              return reloadEmployees(select);
            });
        }
      });
    }
  
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
  
    function mountEmployee(loginEmp) {
      hide(loginSection);
      hide(managerSection);
      show(employeeSection);
      empName.textContent = loginEmp.name;
      lastPunch.textContent = "";
      employeeSection.querySelectorAll("button.action").forEach(function (b) {
        b.onclick = function () {
          var type = b.getAttribute("data-type");
          var ts = Date.now();
          window.pingpontoDb.addPunch(loginEmp.id, type, ts).then(function () {
            lastPunch.textContent =
              "Último registro: " + type + " em " + fmtTs(ts);
          });
        };
      });
      $("employeeLogout").onclick = function () {
        show(loginSection);
        hide(employeeSection);
      };
    }
  
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
          var td1 = document.createElement("td");
          td1.textContent = e.id;
          tr.appendChild(td1);
          var td2 = document.createElement("td");
          td2.textContent = e.name;
          tr.appendChild(td2);
          var td3 = document.createElement("td");
          td3.textContent = e.active ? "Sim" : "Não";
          tr.appendChild(td3);
          var td4 = document.createElement("td");
          var btnAct = document.createElement("button");
          btnAct.textContent = e.active ? "Desativar" : "Ativar";
          btnAct.onclick = function () {
            window.pingpontoDb
              .setEmployeeActive(e, !e.active)
              .then(renderEmpTable)
              .then(function () {
                reloadEmployees($("reportEmp"));
                reloadEmployees(employeeSelect);
              });
          };
          var btnDel = document.createElement("button");
          btnDel.textContent = "Excluir";
          btnDel.onclick = function () {
            window.pingpontoDb
              .removeEmployee(e.id)
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
  
    function buildCsv(rows) {
      var s = "id,employeeId,type,timestamp\n";
      rows.forEach(function (r) {
        s +=
          [r.id, r.employeeId, r.type, new Date(r.ts).toISOString()].join(",") +
          "\n";
      });
      return s;
    }
  
    function doReport(doc) {
      var empSel = doc.getElementById("reportEmp");
      var df = doc.getElementById("dateFrom");
      var dt = doc.getElementById("dateTo");
      var tbl = doc.getElementById("reportTable");
      var btn = doc.getElementById("btnReport");
      var csv = doc.getElementById("btnCsv");
      btn.onclick = function () {
        var id = parseInt(empSel.value, 10);
        var from = df.value ? new Date(df.value + "T00:00:00").getTime() : 0;
        var to = dt.value
          ? new Date(dt.value + "T23:59:59").getTime()
          : Date.now();
        window.pingpontoDb
          .listPunchesByEmpAndRange(id, from, to)
          .then(function (rows) {
            tbl.innerHTML = "";
            var head = doc.createElement("tr");
            ["Data/Hora", "Tipo"].forEach(function (h) {
              var th = doc.createElement("th");
              th.textContent = h;
              head.appendChild(th);
            });
            tbl.appendChild(head);
            rows.forEach(function (r) {
              var tr = doc.createElement("tr");
              var td1 = doc.createElement("td");
              td1.textContent = fmtTs(r.ts);
              var td2 = doc.createElement("td");
              td2.textContent = r.type;
              tr.appendChild(td1);
              tr.appendChild(td2);
              tbl.appendChild(tr);
            });
            csv.onclick = function () {
              var blob = new Blob([buildCsv(rows)], { type: "text/csv" });
              var url = URL.createObjectURL(blob);
              var a = doc.createElement("a");
              a.href = url;
              a.download = "espelho.csv";
              a.click();
              URL.revokeObjectURL(url);
            };
          });
      };
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
      $("btnReport").onclick = function () {
        doReport(document);
      };
      $("btnCsv").onclick = function () {
        doReport(document);
      };
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
          if (emp) {
            mountEmployee(emp);
          } else {
            alert("PIN inválido");
          }
        });
      };
      $("managerEnter").onclick = function () {
        var pin = managerPin.value;
        window.pingpontoDb.authManager(pin).then(function (ok) {
          if (ok) {
            mountManager();
          } else {
            alert("PIN do gestor inválido");
          }
        });
      };
    }
  
    window.pingponto = {
      mountReport: function (doc) {
        reloadEmployees(doc.getElementById("reportEmp")).then(function () {
          doReport(doc);
        });
      },
    };
  
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js");
    }
    ensureManagerPin().then(mountLogin);
  })();
  