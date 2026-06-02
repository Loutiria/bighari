window.BighariActions = (() => {
  const S = window.BighariState;
  const { state } = S;
  const R = () => window.BighariRender;

  function openDrawer(kicker, title, html) {
    document.getElementById('drawerKicker').textContent = kicker;
    document.getElementById('drawerTitle').textContent = title;
    document.getElementById('drawerBody').innerHTML = html;
    document.getElementById('drawerBackdrop').hidden = false;
    const drawer = document.getElementById('drawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    document.getElementById('drawerBackdrop').hidden = true;
    const drawer = document.getElementById('drawer');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  function escapeHtml(value) { return R().escapeHtml(value); }
  function options(items, selected='') { return items.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(v)}</option>`).join(''); }

  function detailOrder(id) {
    const order = S.orderById(id); if (!order) return;
    const check = S.orderMaterialCheck(order);
    const materials = order.materials.map(S.materialById).filter(Boolean).map(m => {
      const status = S.materialStatus(m);
      return `<div class="compact-row"><span>${R().pill(S.statusLabel(status), S.statusLevel(status))}</span><div><strong>${escapeHtml(m.name)} · ${escapeHtml(m.color)}</strong><span class="card-meta">Need ${S.requiredUnits(order,m)} · Available ${S.availableUnits(m)} units · Reorder level ${m.reorderPoint}</span></div></div>`;
    }).join('');
    openDrawer('Order Details', order.id, `<div class="list-stack">
      <div class="card"><h3>${escapeHtml(order.product)}</h3><p class="card-meta">${escapeHtml(order.customer)} · Due ${escapeHtml(order.due)} · ${escapeHtml(order.delivery)}</p>${R().pill(check.label, check.state)}<p>${escapeHtml(order.notes || '')}</p></div>
      <div class="card"><strong>Current Status</strong><p>${escapeHtml(order.stage)}</p><div class="card-actions"><button class="btn btn-primary" data-action="next" data-id="${order.id}">Move Stage</button><button class="btn" data-action="check-stock" data-id="${order.id}">Check Stock</button></div></div>
      <div class="card"><strong>Required Materials</strong><div class="list-stack" style="margin-top:12px">${materials || '<div class="empty-state small">No materials assigned.</div>'}</div></div>
    </div>`);
  }
  function detailMaterial(id) {
    const material = S.materialById(id); if (!material) return;
    const status = S.materialStatus(material);
    const affected = state.orders.filter(o => o.materials.includes(id) && o.stage !== 'Completed');
    openDrawer('Material Details', `${material.name} · ${material.color}`, `<div class="list-stack">
      <div class="card">${R().pill(S.statusLabel(status), S.statusLevel(status))}<h3>${S.availableUnits(material)} units available</h3><p class="card-meta">${material.stock} total · ${material.reserved} reserved · reorder level ${material.reorderPoint}</p></div>
      <div class="card"><strong>Restock Information</strong><p>${material.incoming ? `${material.incoming} incoming units · ETA ${escapeHtml(material.eta)}` : 'No incoming restock recorded.'}</p><p class="card-meta">Supplier source: ${escapeHtml(material.supplier || 'Not set')}</p></div>
      <div class="card"><strong>Related Active Orders</strong><div class="list-stack" style="margin-top:12px">${affected.length ? affected.map(o => `<div class="compact-row"><span>${R().pill(o.stage,'active')}</span><div><strong>${escapeHtml(o.id)}</strong><span class="card-meta">${escapeHtml(o.product)}</span></div></div>`).join('') : '<div class="empty-state small">No active orders using this material.</div>'}</div></div>
      <button class="btn btn-primary" data-command="add-restock">Update Stock</button>
    </div>`);
  }

  function addOrderDrawer() {
    const products = Object.keys(window.BIGHARI_DATA.productMaterialMap);
    openDrawer('Phase 1', 'Add Order', `<form class="form-stack" data-form="add-order">
      <div class="form-phase"><span>1</span><div><strong>Customer Details</strong><p>Record only the details needed for order monitoring.</p></div></div>
      <label>Customer Name<input name="customer" required placeholder="Example: M. Dela Cruz"></label>
      <label>Contact / Channel<input name="contact" value="Messenger" placeholder="Messenger, phone, or note"></label>
      <div class="form-phase"><span>2</span><div><strong>Bouquet Details</strong><p>Select bouquet type, quantity, and target date.</p></div></div>
      <label>Bouquet Type<select name="product" required>${options(products)}</select></label>
      <label>Quantity<input name="qty" type="number" min="1" value="1" required></label>
      <label>Deadline<input name="due" placeholder="Example: Jun 8, 3:00 PM" required></label>
      <div class="form-phase"><span>3</span><div><strong>Order Setup</strong><p>Payment and pickup/delivery status determine the starting order stage.</p></div></div>
      <label>Payment Status<select name="payment">${options(S.paymentOptions)}</select></label>
      <label>Pickup / Delivery<select name="delivery">${options(S.deliveryOptions)}</select></label>
      <label>Notes<textarea name="notes" rows="3" placeholder="Color theme, request, or reminder"></textarea></label>
      <div class="drawer-footer"><button class="btn" type="button" data-close-drawer>Cancel</button><button class="btn btn-primary" type="submit">Save Order</button></div>
    </form>`);
  }

  function stockCheckerDrawer(orderId='') {
    const selected = orderId || state.orders.find(o => o.stage !== 'Completed')?.id || '';
    const result = selected ? S.checkOrderStock(selected) : null;
    const rows = result?.rows?.map(r => `<div class="stock-result-row ${R().stateClass(S.statusLevel(r.status))}"><div>${R().pill(S.statusLabel(r.status), S.statusLevel(r.status))}<strong>${escapeHtml(r.material.name)} · ${escapeHtml(r.material.color)}</strong><span>Needed ${r.needed} · Available ${r.available}</span></div></div>`).join('') || '<div class="empty-state small">Select an order to check stock.</div>';
    openDrawer('Phase 2', 'Check Stock', `<form class="form-stack" data-form="check-stock">
      <div class="form-phase"><span>1</span><div><strong>Select Order</strong><p>Stock checking is tied to an order, not a generic search.</p></div></div>
      <label>Order<select name="orderId" data-live-stock-select>${state.orders.filter(o=>o.stage!=='Completed').map(o=>`<option value="${o.id}" ${o.id===selected?'selected':''}>${o.id} · ${escapeHtml(o.product)}</option>`).join('')}</select></label>
      <div class="form-phase"><span>2</span><div><strong>Availability Result</strong><p>The result answers whether the order can proceed.</p></div></div>
      <div class="card">${result ? R().pill(result.check.label, result.check.state) : ''}<div class="stock-results">${rows}</div></div>
      <div class="drawer-footer"><button class="btn" type="button" data-close-drawer>Cancel</button><button class="btn" type="button" data-command="add-restock">Update Stock</button><button class="btn btn-primary" type="submit">Reserve if Available</button></div>
    </form>`);
  }

  function updateStockDrawer() {
    openDrawer('Phase 3', 'Update Stock', `<form class="form-stack" data-form="update-stock">
      <div class="form-phase"><span>1</span><div><strong>Choose Stock Action</strong><p>Use one small stock form: add restock, deduct used stock, or correct count.</p></div></div>
      <label>Action<select name="stockAction"><option value="add">Add Restock</option><option value="deduct">Use / Deduct Stock</option><option value="correct">Correct Count</option></select></label>
      <label>Material<select name="materialId">${state.materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} · ${escapeHtml(m.color)} (${S.availableUnits(m)} available)</option>`).join('')}</select></label>
      <label>Quantity<input name="qty" type="number" min="0" value="1" required></label>
      <label>Reason<input name="reason" placeholder="Example: Shopee restock, used for order, physical count correction"></label>
      <label>Date<input name="date" type="date"></label>
      <div class="drawer-footer"><button class="btn" type="button" data-close-drawer>Cancel</button><button class="btn btn-primary" type="submit">Save Stock Update</button></div>
    </form>`);
  }

  function printReportDrawer() {
    openDrawer('Phase 4', 'Print Report', `<div class="form-stack">
      <div class="form-phase"><span>1</span><div><strong>Choose Basic Report</strong><p>Reports stay within PMP scope: order monitoring and inventory monitoring only.</p></div></div>
      <div class="report-choice-grid">
        <button class="action-tile" data-report-view="order-reports"><strong>Daily Orders</strong><span>Order status, customer, due date</span></button>
        <button class="action-tile" data-report-view="order-reports"><strong>Completed Orders</strong><span>Completed order records</span></button>
        <button class="action-tile" data-report-view="inventory-reports"><strong>Inventory Summary</strong><span>Material quantities and status</span></button>
        <button class="action-tile" data-report-view="inventory-reports"><strong>Low Stock Materials</strong><span>Stock warnings and restock visibility</span></button>
      </div>
      <div class="card"><strong>A4 Print Format</strong><p class="card-meta">Title, date range, summary blocks, simple table, prepared by, and remarks.</p></div>
      <div class="drawer-footer"><button class="btn" type="button" data-close-drawer>Cancel</button><button class="btn btn-primary" data-action="print-now">Print Current Report</button></div>
    </div>`);
  }

  function runCommand(command) {
    if (command === 'new-order') return addOrderDrawer();
    if (command === 'reserve-stock') return stockCheckerDrawer();
    if (command === 'add-restock' || command === 'update-stock') return updateStockDrawer();
    if (command === 'summary') return printReportDrawer();
  }

  function formToObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  function handleSubmit(event) {
    const form = event.target.closest('form[data-form]'); if (!form) return;
    event.preventDefault();
    const payload = formToObject(form);
    if (form.dataset.form === 'add-order') {
      const order = S.addOrder(payload);
      state.currentView = 'order-status';
      closeDrawer();
      window.BighariRender.renderView();
      stockCheckerDrawer(order.id);
    }
    if (form.dataset.form === 'check-stock') {
      const result = S.reserveMaterials(payload.orderId);
      S.log(`Check Stock completed for ${payload.orderId}: ${result?.label || 'reviewed'}.`);
      closeDrawer(); window.BighariRender.renderView();
    }
    if (form.dataset.form === 'update-stock') {
      S.adjustStock(payload);
      closeDrawer(); window.BighariRender.renderView();
    }
  }

  function handleClick(event) {
    const closeEl = event.target.closest('[data-close-drawer]');
    const actionEl = event.target.closest('[data-action]');
    const viewEl = event.target.closest('[data-view]');
    const commandEl = event.target.closest('[data-command]');
    const reportViewEl = event.target.closest('[data-report-view]');
    if (closeEl) return closeDrawer();
    if (reportViewEl) { state.currentView = reportViewEl.dataset.reportView; closeDrawer(); window.BighariRender.renderView(); return; }
    if (viewEl) { state.currentView = viewEl.dataset.view; window.BighariRender.renderView(); return; }
    if (commandEl) { runCommand(commandEl.dataset.command); return; }
    if (!actionEl) return;
    const action = actionEl.dataset.action, id = actionEl.dataset.id;
    if (action === 'next') S.moveNext(id);
    if (action === 'check-stock' || action === 'reserve') { stockCheckerDrawer(id); return; }
    if (action === 'receive') S.receiveRestock(id);
    if (action === 'details') { if (actionEl.dataset.type === 'order') detailOrder(id); if (actionEl.dataset.type === 'material') detailMaterial(id); return; }
    if (action === 'print-now') { window.print(); return; }
    window.BighariRender.renderView();
  }
  function handleChange(event) {
    const select = event.target.closest('[data-live-stock-select]');
    if (select) stockCheckerDrawer(select.value);
  }
  return { handleClick, handleSubmit, handleChange, closeDrawer, openDrawer };
})();
