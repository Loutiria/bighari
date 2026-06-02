document.addEventListener('DOMContentLoaded', () => {
  document.body.dataset.mockDataStatus = window.BIGHARI_DATA ? 'loaded' : 'missing';
  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.textContent.trim().toLowerCase() === 'print report' && !button.dataset.command) window.print();
  });
});
