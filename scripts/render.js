window.BighariRender = (() => {
  const S = window.BighariState;
  const { state } = S;

  const viewMeta = {
    overview: ['Dashboard', 'Overview'],
    'order-tracking': ['Orders', 'Order Tracking'],
    'order-status': ['Orders', 'Order Status'],
    'inventory-monitoring': ['Inventory', 'Inventory Monitoring'],
    'stock-availability': ['Inventory', 'Stock Availability'],
    'low-stock-alerts': ['Alerts', 'Low Stock Alerts'],
    'order-alerts': ['Alerts', 'Order Alerts'],
    'order-reports': ['Reports', 'Order Reports'],
    'inventory-reports': ['Reports', 'Inventory Reports'],
    preferences: ['Settings', 'Preferences'],
    archive: ['Settings', 'Archive']
  };
  const stageLevels = { Inquiry:'neutral', Confirmed:'active', 'Preparing Materials':'warning', 'In Production':'active', 'Ready for Pickup/Delivery':'stable', Completed:'neutral' };
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function stateClass(level) { return `state-${level || 'neutral'}`; }
  function pill(text, level='neutral') { return `<span class="state-pill ${stateClass(level)}">${escapeHtml(text)}</span>`; }
  function sectionHeader(title, text) { return `<div class="board-header"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div>`; }

  function renderNav() {
    document.getElementById('navGroups').innerHTML = window.BIGHARI_DATA.nav.map(group => `
      <div class="nav-section"><h3>${escapeHtml(group.group)}</h3>
      ${group.items.map(item => `<button class="nav-item ${state.currentView === item.id ? 'active' : ''}" data-view="${item.id}"><span>${escapeHtml(item.label)}</span><span>›</span></button>`).join('')}
      </div>`).join('');
    const mobileItems = [['overview','Home'], ['order-tracking','Orders'], ['inventory-monitoring','Stock'], ['low-stock-alerts','Alerts']];
    document.getElementById('bottomNav').innerHTML = mobileItems.map(([id,label]) => `<button class="${state.currentView === id ? 'active' : ''}" data-view="${id}">${label}</button>`).join('');
  }
  function renderPulse() {
    const c = S.overviewCounts();
    const items = [
      ['Active Orders', c.activeOrders, 'active', 'Customer orders currently monitored'],
      ['Orders Ready', c.readyOrders, 'stable', 'Ready for pickup or delivery'],
      ['Low Stock', c.lowStock, c.lowStock ? 'warning' : 'stable', 'Materials below reorder level'],
      ['Out of Stock', c.outStock, c.outStock ? 'critical' : 'stable', 'Materials unavailable']
    ];
    document.getElementById('businessPulse').innerHTML = items.map(([label,value,level,meta]) => `<article class="summary-card"><div class="card-header">${pill(label, level)}</div><div class="stat-value">${value}</div><p class="card-meta">${escapeHtml(meta)}</p></article>`).join('');
  }
  function statusStepper(stage) {
    const short = ['Inquiry','Confirmed','Preparing Materials','In Production','Ready for Pickup/Delivery'];
    const current = short.indexOf(stage);
    return `<div class="mini-stepper" aria-label="Order progress">${short.map((s,i)=>`<span class="${i <= current ? 'done' : ''}" title="${escapeHtml(s)}"></span>`).join('')}</div>`;
  }
  function orderNextAction(order) {
    const check = S.orderMaterialCheck(order);
    if (order.payment === 'Pending') return 'Confirm payment';
    if (check.state === 'critical') return 'Update stock or restock';
    if (order.stage === 'Inquiry') return 'Confirm order';
    if (order.stage === 'Confirmed') return 'Check stock';
    if (order.stage === 'Preparing Materials') return 'Start production';
    if (order.stage === 'In Production') return 'Ready for pickup/delivery';
    if (order.stage === 'Ready for Pickup/Delivery') return 'Complete order';
    return 'Completed record';
  }
  function orderMiniCard(order) {
    const check = S.orderMaterialCheck(order);
    const level = check.state === 'critical' ? 'critical' : (stageLevels[order.stage] || check.state || 'neutral');
    return `<article class="flow-card ${stateClass(level)}">
      <div class="flow-card-top">${pill(order.stage, level)}<span class="tiny-id">${escapeHtml(order.id)}</span></div>
      <h3>${escapeHtml(order.product)}</h3><p>${escapeHtml(order.customer)} · ${escapeHtml(order.due)}</p>
      ${statusStepper(order.stage)}
      <div class="next-action"><span>Next</span><strong>${escapeHtml(orderNextAction(order))}</strong></div>
      <div class="flow-actions"><button class="btn btn-primary" data-action="next" data-id="${order.id}">Move Stage</button><button class="btn" data-action="check-stock" data-id="${order.id}">Check Stock</button><button class="btn" data-action="details" data-type="order" data-id="${order.id}">View</button></div>
    </article>`;
  }
  function orderCompactRow(order) {
    const check = S.orderMaterialCheck(order);
    const level = check.state === 'critical' ? 'critical' : (stageLevels[order.stage] || 'neutral');
    return `<div class="status-row"><div class="status-main">${pill(order.stage, level)}<strong>${escapeHtml(order.product)}</strong><span>${escapeHtml(order.customer)} · Due: ${escapeHtml(order.due)}</span></div><div class="status-side"><span class="card-meta">${escapeHtml(order.payment)}</span><button class="btn" data-action="details" data-type="order" data-id="${order.id}">Open</button></div></div>`;
  }
  function materialMiniCard(material) {
    const status = S.materialStatus(material), level = S.statusLevel(status), available = S.availableUnits(material);
    return `<article class="material-strip ${stateClass(level)}"><div>${pill(S.statusLabel(status), level)}<h3>${escapeHtml(material.name)}</h3><p>${escapeHtml(material.category)} · ${escapeHtml(material.color)}</p></div><div class="material-numbers"><strong>${available}</strong><span>available</span></div><button class="btn" data-action="details" data-type="material" data-id="${material.id}">View</button></article>`;
  }
  function alertStrip(text, level='warning', action='Open') { return `<div class="alert-strip ${stateClass(level)}"><span>${pill(level === 'critical' ? 'Critical' : level === 'warning' ? 'Warning' : 'Info', level)}</span><div><strong>${escapeHtml(text)}</strong><span>Aligned with low-stock alert and order monitoring scope.</span></div><button class="btn">${escapeHtml(action)}</button></div>`; }
  function activityList() { return `<div class="timeline-list">${state.activity.map(item => `<div class="timeline-item"><span></span><p>${escapeHtml(item)}</p></div>`).join('')}</div>`; }

  function chartData() {
    const counts = S.overviewCounts();
    const stageCounts = Object.fromEntries(S.stageOrder.map(stage => [stage, state.orders.filter(o => o.stage === stage).length]));
    const stockCounts = { Stable: 0, 'Low Stock': 0, 'Out of Stock': 0, Incoming: 0 };
    state.materials.forEach(m => {
      const st = S.materialStatus(m);
      if (st === 'out') stockCounts['Out of Stock'] += 1;
      else if (st === 'low') stockCounts['Low Stock'] += 1;
      else stockCounts.Stable += 1;
      if (Number(m.incoming || 0) > 0) stockCounts.Incoming += 1;
    });
    return { counts, stageCounts, stockCounts };
  }
  function workflowChart() {
    const { stageCounts } = chartData();
    const total = Math.max(1, Object.values(stageCounts).reduce((a,b)=>a+b,0));
    const classes = ['inquiry','confirmed','preparing','production','ready','completed'];
    return `<article class="chart-card chart-card-wide"><div class="chart-card-header"><div><h3>Order Workflow Status</h3><p>Distribution of the ${state.orders.length} mock orders by stage.</p></div></div><div class="stacked-bar">${S.stageOrder.map((stage,i)=>{ const val = stageCounts[stage] || 0; const width = Math.max(4, (val/total)*100); return `<div class="stack-segment ${classes[i]}" style="width:${width}%" title="${escapeHtml(stage)}: ${val}">${val}</div>`; }).join('')}</div><div class="chart-legend compact">${S.stageOrder.map((stage,i)=>`<span><i class="dot ${classes[i]}"></i>${escapeHtml(stage)}</span>`).join('')}</div></article>`;
  }
  function stockConditionChart() {
    const { stockCounts } = chartData();
    const max = Math.max(1, ...Object.values(stockCounts));
    const rows = [['Stable','stable'],['Low Stock','warning'],['Out of Stock','danger'],['Incoming','active']];
    return `<article class="chart-card"><div class="chart-card-header"><div><h3>Stock Condition</h3><p>Inventory grouped by availability.</p></div></div><div class="bar-chart">${rows.map(([label,cls])=>{ const value = stockCounts[label] || 0; return `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.max(5,(value/max)*100)}%"></div></div><b>${value}</b></div>`; }).join('')}</div></article>`;
  }
  function readyDelayedChart() {
    const active = state.orders.filter(o => o.stage !== 'Completed');
    const delayed = active.filter(o => S.orderMaterialCheck(o).state === 'critical').length;
    const near = active.filter(o => S.orderMaterialCheck(o).state === 'warning').length;
    const on = Math.max(0, active.length - delayed - near);
    const pct = Math.round((on / Math.max(1, active.length)) * 100);
    return `<article class="chart-card"><div class="chart-card-header"><div><h3>Ready vs Delayed</h3><p>Simple workflow health view.</p></div></div><div class="donut-wrap"><div class="donut-chart" style="background:conic-gradient(#22c55e 0 ${pct}%, #f59e0b ${pct}% ${Math.min(100,pct+Math.round((near/Math.max(1,active.length))*100))}%, #ef4444 0 100%)"></div><div class="donut-label"><strong>${pct}%</strong><span>On Track</span></div></div><div class="chart-legend vertical"><span><i class="dot stable"></i>On Time — ${on}</span><span><i class="dot warning"></i>Near Deadline — ${near}</span><span><i class="dot danger"></i>Delayed — ${delayed}</span></div></article>`;
  }
  function weeklyChart() {
    return `<article class="chart-card chart-card-wide"><div class="chart-card-header"><div><h3>Weekly Order Activity</h3><p>Orders added and completed during the week.</p></div></div><svg class="line-chart" viewBox="0 0 640 220" role="img" aria-label="Weekly order activity line chart"><line x1="40" y1="180" x2="610" y2="180" class="axis"/><line x1="40" y1="40" x2="40" y2="180" class="axis"/><polyline points="40,150 135,130 230,145 325,95 420,110 515,70 610,85" class="line added"/><polyline points="40,165 135,150 230,140 325,120 420,105 515,98 610,75" class="line completed"/><g class="chart-days"><text x="40" y="205">Mon</text><text x="135" y="205">Tue</text><text x="230" y="205">Wed</text><text x="325" y="205">Thu</text><text x="420" y="205">Fri</text><text x="515" y="205">Sat</text><text x="610" y="205">Sun</text></g></svg><div class="chart-legend compact"><span><i class="line-dot added"></i>Orders Added</span><span><i class="line-dot completed"></i>Orders Completed</span></div></article>`;
  }
  function usageChart() {
    const top = [...state.materials].sort((a,b)=> (b.reserved||0) - (a.reserved||0)).slice(0,4);
    const max = Math.max(1, ...top.map(m => Number(m.stock || 0)));
    return `<article class="chart-card chart-card-wide"><div class="chart-card-header"><div><h3>Material Usage</h3><p>Common materials reserved for active bouquet orders.</p></div></div><div class="usage-bars">${top.map(m=>{ const pct = Math.min(100, Math.round((Number(m.reserved||0)/Math.max(1,Number(m.stock||1)))*100)); const cls = pct > 85 ? 'danger' : pct > 60 ? 'warning' : ''; return `<div class="usage-row"><span>${escapeHtml(m.name)} · ${escapeHtml(m.color)}</span><div class="usage-track"><div class="${cls}" style="width:${Math.max(4,pct)}%"></div></div><b>${pct}%</b></div>`; }).join('')}</div></article>`;
  }
  function dashboardCharts() {
    return `<div class="chart-dashboard-section" id="dashboardCharts"><div class="chart-section-header"><div><p class="eyebrow">Dashboard Charts</p><h2>Operational Monitoring Charts</h2><p>Offline charts generated from mock order and inventory records.</p></div></div><div class="charts-grid">${workflowChart()}${stockConditionChart()}${readyDelayedChart()}${weeklyChart()}${usageChart()}</div></div>`;
  }

  function overviewView() {
    const active = state.orders.filter(o => o.stage !== 'Completed').slice(0, 6);
    const low = state.materials.filter(m => ['low','out'].includes(S.materialStatus(m))).slice(0, 6);
    return `<section class="panel full-span">${sectionHeader('Daily Monitoring Overview','A simple mobile-friendly overview for orders, stock availability, dashboard charts, and recent activity.')}
      <div class="mock-data-banner"><strong>Mock data loaded:</strong> ${state.orders.length} orders · ${state.materials.length} inventory materials · ${state.activity.length} visible activities</div>
      <div class="action-flow"><button class="action-tile" data-command="new-order"><strong>Add Order</strong><span>Record customer and bouquet details</span></button><button class="action-tile" data-command="reserve-stock"><strong>Check Stock</strong><span>Verify materials before production</span></button><button class="action-tile" data-command="add-restock"><strong>Update Stock</strong><span>Add, deduct, or correct material count</span></button><button class="action-tile" data-command="summary"><strong>Print Report</strong><span>Prepare basic monitoring reports</span></button></div>
      <div class="grid-two"><div class="card"><h3>Today’s Orders</h3><div class="flow-card-grid compact">${active.map(orderMiniCard).join('')}</div></div><div class="card"><h3>Stock Warnings</h3><div class="strip-stack">${low.map(materialMiniCard).join('') || '<div class="empty-state small">No low-stock materials.</div>'}</div></div></div>
      ${dashboardCharts()}
      <div class="card"><h3>Recent Activity</h3>${activityList()}</div></section>`;
  }

  function orderTrackingView() {
    const active = state.orders.filter(o => o.stage !== 'Completed');
    return `<section class="panel full-span">${sectionHeader('Order Tracking','Monitor customer orders from inquiry to completion.')}
      <div class="toolbar"><button class="btn btn-primary" data-command="new-order">Add Order</button><button class="btn" data-command="reserve-stock">Check Stock</button></div>
      <div class="flow-card-grid">${active.map(orderMiniCard).join('')}</div></section>`;
  }
  function orderStatusView() {
    return `<section class="panel full-span">${sectionHeader('Order Status','A clean workflow view that groups orders by stage instead of a long list.')}
      <div class="workflow-board">${S.stageOrder.map(stage => {
        const orders = state.orders.filter(o => o.stage === stage);
        return `<details class="workflow-group" ${stage !== 'Completed' ? 'open' : ''}><summary><span><strong>${escapeHtml(stage)}</strong><em>${orders.length} order${orders.length === 1 ? '' : 's'}</em></span><b>${orders.length}</b></summary><div class="flow-card-grid compact">${orders.map(orderMiniCard).join('') || '<div class="empty-state small">No orders in this stage.</div>'}</div></details>`;
      }).join('')}</div></section>`;
  }
  function inventoryMonitoringView() {
    const groups = { Stable:[], 'Low Stock':[], 'Out of Stock':[], Incoming:[] };
    state.materials.forEach(m => { const s = S.materialStatus(m); if (s === 'out') groups['Out of Stock'].push(m); else if (s === 'low') groups['Low Stock'].push(m); else groups.Stable.push(m); if (Number(m.incoming||0)>0) groups.Incoming.push(m); });
    return `<section class="panel full-span">${sectionHeader('Inventory Monitoring','Materials are grouped by availability so stock status is easier to scan.')}
      <div class="toolbar"><button class="btn btn-primary" data-command="add-restock">Update Stock</button><button class="btn" data-command="reserve-stock">Check Stock</button></div>
      <div class="inventory-category-grid">${Object.entries(groups).map(([label,items]) => `<div class="inventory-group"><div class="group-title"><div><h3>${escapeHtml(label)}</h3><p>${items.length} material record${items.length === 1 ? '' : 's'}</p></div><span>${items.length}</span></div><div class="strip-stack">${items.map(materialMiniCard).join('') || '<div class="empty-state small">No materials here.</div>'}</div></div>`).join('')}</div></section>`;
  }
  function stockAvailabilityView() {
    return `<section class="panel full-span">${sectionHeader('Stock Availability','Check whether materials are available before confirming or preparing orders.')}
      <div class="stock-check-panel"><div class="card"><h3>Order-Based Stock Check</h3><p class="card-meta">Select Check Stock from an order card or use the global Check Stock button.</p><button class="btn btn-primary" data-command="reserve-stock">Open Stock Checker</button></div><div class="card"><h3>Material Availability</h3><div class="strip-stack">${state.materials.map(materialMiniCard).join('')}</div></div></div></section>`;
  }
  function lowStockAlertsView() {
    const alerts = state.materials.filter(m => ['low','out'].includes(S.materialStatus(m)));
    return `<section class="panel full-span">${sectionHeader('Low Stock Alerts','Simple warnings for materials that need attention.')}
      <div class="toolbar"><button class="btn btn-primary" data-command="add-restock">Update Stock</button></div><div class="strip-stack">${alerts.map(m => alertStrip(`${m.name} · ${m.color} has ${S.availableUnits(m)} available units.`, S.materialStatus(m) === 'out' ? 'critical' : 'warning', 'Update Stock')).join('') || '<div class="empty-state">No low-stock alerts.</div>'}</div></section>`;
  }
  function orderAlertsView() {
    const alerts = state.orders.filter(o => S.orderMaterialCheck(o).state !== 'stable' && o.stage !== 'Completed');
    return `<section class="panel full-span">${sectionHeader('Order Alerts','Lightweight order warnings for payment, material, and deadline attention.')}
      <div class="strip-stack">${alerts.map(o => alertStrip(`${o.id} · ${o.product}: ${S.orderMaterialCheck(o).label}`, S.orderMaterialCheck(o).state, 'Open')).join('') || '<div class="empty-state">No order alerts.</div>'}</div></section>`;
  }
  function reportSummary(kind) {
    const completed = state.orders.filter(o => o.stage === 'Completed').length;
    const active = state.orders.filter(o => o.stage !== 'Completed').length;
    const low = state.materials.filter(m => ['low','out'].includes(S.materialStatus(m))).length;
    if (kind === 'inventory') return [['Total Materials', state.materials.length], ['Low/Out Stock', low], ['Incoming Restocks', state.restocks.filter(r => r.status !== 'Received').length]];
    return [['Active Orders', active], ['Completed Orders', completed], ['Ready Orders', state.orders.filter(o => o.stage === 'Ready for Pickup/Delivery').length]];
  }
  function orderReportsView() {
    return `<section class="panel full-span printable-report">${sectionHeader('Order Reports','Basic order monitoring report suitable for printing.')}
      <div class="toolbar no-print"><button class="btn btn-primary" data-command="summary">Print Report</button></div><div class="report-summary-grid">${reportSummary('order').map(([k,v])=>`<div class="report-block"><span>${escapeHtml(k)}</span><strong>${v}</strong></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Bouquet</th><th>Status</th><th>Due</th><th>Payment</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td>${escapeHtml(o.id)}</td><td>${escapeHtml(o.customer)}</td><td>${escapeHtml(o.product)}</td><td>${escapeHtml(o.stage)}</td><td>${escapeHtml(o.due)}</td><td>${escapeHtml(o.payment)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function inventoryReportsView() {
    return `<section class="panel full-span printable-report">${sectionHeader('Inventory Reports','Basic inventory and low-stock monitoring report.')}
      <div class="toolbar no-print"><button class="btn btn-primary" data-command="summary">Print Report</button></div><div class="report-summary-grid">${reportSummary('inventory').map(([k,v])=>`<div class="report-block"><span>${escapeHtml(k)}</span><strong>${v}</strong></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>Material</th><th>Color</th><th>Category</th><th>Available</th><th>Status</th><th>Incoming</th></tr></thead><tbody>${state.materials.map(m=>`<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.color)}</td><td>${escapeHtml(m.category)}</td><td>${S.availableUnits(m)}</td><td>${S.statusLabel(S.materialStatus(m))}</td><td>${m.incoming || 0}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function preferencesView() { return `<section class="panel full-span">${sectionHeader('Preferences','Prototype settings only.')}<div class="card"><p>System preferences are kept minimal to stay aligned with the PMP scope.</p><p class="card-meta">Working source ZIP: ${escapeHtml(window.BIGHARI_DATA.workingSourceZip)}</p></div></section>`; }
  function archiveView() { const completed = state.orders.filter(o => o.stage === 'Completed'); return `<section class="panel full-span">${sectionHeader('Archive','Quiet completed order archive.')}<div class="status-row-stack">${completed.map(orderCompactRow).join('') || '<div class="empty-state">No completed orders.</div>'}</div></section>`; }

  function renderView() {
    const [section, title] = viewMeta[state.currentView] || viewMeta.overview;
    document.getElementById('sectionLabel').textContent = section;
    document.getElementById('pageTitle').textContent = title;
    const views = { overview: overviewView, 'order-tracking': orderTrackingView, 'order-status': orderStatusView, 'inventory-monitoring': inventoryMonitoringView, 'stock-availability': stockAvailabilityView, 'low-stock-alerts': lowStockAlertsView, 'order-alerts': orderAlertsView, 'order-reports': orderReportsView, 'inventory-reports': inventoryReportsView, preferences: preferencesView, archive: archiveView };
    document.getElementById('appContent').innerHTML = (views[state.currentView] || overviewView)();
    renderNav(); renderPulse();
  }
  return { renderView, pill, stateClass, orderMiniCard, materialMiniCard, escapeHtml };
})();
