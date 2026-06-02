window.BighariState = (() => {
  const data = window.BIGHARI_DATA;
  const state = {
    currentView: 'overview',
    orders: structuredClone(data.orders),
    materials: structuredClone(data.materials),
    restocks: structuredClone(data.restocks),
    activity: [...data.activity],
    lastOrderNumber: 1013,
    selectedReport: 'daily-orders'
  };

  const stageOrder = ['Inquiry','Confirmed','Preparing Materials','In Production','Ready for Pickup/Delivery','Completed'];
  const paymentOptions = ['Pending','50% DP','Paid'];
  const deliveryOptions = ['Pickup','Maxim'];

  function materialById(id) { return state.materials.find(m => m.id === id); }
  function orderById(id) { return state.orders.find(o => o.id === id); }
  function availableUnits(material) { return Math.max(0, Number(material.stock || 0) - Number(material.reserved || 0)); }
  function materialStatus(material) {
    const available = availableUnits(material);
    if (available <= 0) return 'out';
    if (available <= Number(material.reorderPoint || 0)) return 'low';
    return 'stable';
  }
  function statusLabel(status) { return status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : status === 'incoming' ? 'Incoming' : 'Stable'; }
  function statusLevel(status) { return status === 'out' ? 'critical' : status === 'low' ? 'warning' : status === 'incoming' ? 'active' : 'stable'; }

  function requiredUnits(order, material) { return Number(order.qty || 1) * Number(material.requiredPerBouquet || 1); }
  function orderMaterialCheck(order) {
    if (!order) return { state: 'neutral', label: 'No Order', notes: [] };
    if (order.payment === 'Pending') return { state: 'warning', label: 'Payment Pending', notes: ['Payment is not yet confirmed.'] };
    const notes = order.materials.map(materialById).filter(Boolean)
      .filter(m => availableUnits(m) < requiredUnits(order, m))
      .map(m => `${m.name} (${m.color}) needs ${requiredUnits(order, m)} units but only ${availableUnits(m)} are available.`);
    if (notes.length) return { state: 'critical', label: 'Materials Needed', notes };
    const low = order.materials.map(materialById).filter(Boolean).some(m => materialStatus(m) === 'low');
    if (low) return { state: 'warning', label: 'Available but Low', notes: ['One or more required materials are near reorder level.'] };
    return { state: 'stable', label: 'Materials Available', notes: [] };
  }

  function overviewCounts() {
    return {
      activeOrders: state.orders.filter(o => o.stage !== 'Completed').length,
      readyOrders: state.orders.filter(o => o.stage === 'Ready for Pickup/Delivery').length,
      lowStock: state.materials.filter(m => materialStatus(m) === 'low').length,
      outStock: state.materials.filter(m => materialStatus(m) === 'out').length
    };
  }
  function log(message) { state.activity.unshift(message); state.activity = state.activity.slice(0, 10); }

  function moveNext(orderId) {
    const order = orderById(orderId); if (!order) return;
    const index = stageOrder.indexOf(order.stage);
    order.stage = stageOrder[Math.min(index + 1, stageOrder.length - 1)] || 'Confirmed';
    log(`${order.id} updated to ${order.stage}.`);
  }
  function reserveMaterials(orderId) {
    const order = orderById(orderId); if (!order) return;
    const check = orderMaterialCheck(order);
    if (check.state === 'critical' || check.state === 'warning' && order.payment === 'Pending') { log(`Stock check for ${order.id}: ${check.label}.`); return check; }
    order.materials.forEach(id => {
      const material = materialById(id); if (!material) return;
      const needed = requiredUnits(order, material);
      const available = availableUnits(material);
      material.reserved += Math.min(needed, available);
    });
    order.stage = 'Preparing Materials';
    log(`Materials checked and reserved for ${order.id}.`);
    return orderMaterialCheck(order);
  }
  function receiveRestock(restockId) {
    const restock = state.restocks.find(r => r.id === restockId); if (!restock) return;
    const material = materialById(restock.materialId); if (!material) return;
    material.stock += Number(restock.qty || 0);
    material.incoming = Math.max(0, Number(material.incoming || 0) - Number(restock.qty || 0));
    restock.status = 'Received';
    log(`${material.name} (${material.color}) updated with ${restock.qty} received units.`);
  }
  function addOrder(payload) {
    state.lastOrderNumber += 1;
    const id = `ORD-${state.lastOrderNumber}`;
    const mapped = data.productMaterialMap[payload.product] || [];
    const order = {
      id,
      customer: payload.customer || 'New Customer',
      contact: payload.contact || 'Messenger',
      product: payload.product || 'Customized Bouquet',
      due: payload.due || 'To be scheduled',
      stage: payload.payment === 'Pending' ? 'Inquiry' : 'Confirmed',
      priority: 'neutral',
      qty: Math.max(1, Number(payload.qty || 1)),
      payment: payload.payment || 'Pending',
      materials: mapped,
      delivery: payload.delivery || 'Pickup',
      notes: payload.notes || ''
    };
    state.orders.unshift(order);
    log(`${id} added for ${order.customer}.`);
    return order;
  }
  function adjustStock(payload) {
    const material = materialById(payload.materialId); if (!material) return null;
    const qty = Number(payload.qty || 0);
    const action = payload.stockAction;
    if (action === 'add') material.stock += qty;
    if (action === 'deduct') material.stock = Math.max(0, material.stock - qty);
    if (action === 'correct') material.stock = Math.max(0, qty);
    log(`${material.name} (${material.color}) stock updated: ${action} ${qty}. Reason: ${payload.reason || 'not specified'}.`);
    return material;
  }
  function checkOrderStock(orderId) {
    const order = orderById(orderId);
    return { order, check: orderMaterialCheck(order), rows: order ? order.materials.map(materialById).filter(Boolean).map(m => ({ material: m, needed: requiredUnits(order,m), available: availableUnits(m), status: materialStatus(m) })) : [] };
  }

  return { state, stageOrder, paymentOptions, deliveryOptions, materialById, orderById, availableUnits, materialStatus, statusLabel, statusLevel, requiredUnits, orderMaterialCheck, overviewCounts, moveNext, reserveMaterials, receiveRestock, addOrder, adjustStock, checkOrderStock, log };
})();
