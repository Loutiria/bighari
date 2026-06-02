document.addEventListener('DOMContentLoaded', () => {
  window.BighariRender.renderView();
  document.body.addEventListener('click', window.BighariActions.handleClick);
  document.body.addEventListener('submit', window.BighariActions.handleSubmit);
  document.body.addEventListener('change', window.BighariActions.handleChange);
  document.getElementById('drawerClose').addEventListener('click', window.BighariActions.closeDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', window.BighariActions.closeDrawer);
});
