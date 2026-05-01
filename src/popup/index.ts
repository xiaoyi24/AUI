/**
 * AUI Popup Script
 * 扩展弹出窗口的交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
  const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;

  // 检测当前标签页状态
  checkCurrentTab();

  // 切换精灵激活状态
  toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_SPRITE_STATE',
      state: 'introducing',
    });

    window.close();
  });

  // 打开设置页
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.() 
      ?? alert('设置页面将在后续版本中添加');
  });
});

async function checkCurrentTab(): Promise<void> {
  const statusDot = document.getElementById('statusDot') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id || tab.url?.startsWith('chrome://')) {
    statusDot.classList.add('inactive');
    statusText.textContent = '当前页面不支持（系统页面）';
    return;
  }

  statusDot.classList.remove('inactive');
  statusText.textContent = `已就绪 — ${tab.url ? new URL(tab.url).hostname : '未知网站'}`;
}
