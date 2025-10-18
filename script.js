(() => {
const { ethers } = window;

// Элементы
const btnNew = document.getElementById('btnNew');
const btnImport = document.getElementById('btnImport');
const walletPanel = document.getElementById('walletPanel');
const addressEl = document.getElementById('address');
const mnemonicEl = document.getElementById('mnemonic');
const btnReveal = document.getElementById('btnReveal');
const passwordInput = document.getElementById('password');
const btnSaveLocal = document.getElementById('btnSaveLocal');
const btnShowPK = document.getElementById('btnShowPK');
const btnSend = document.getElementById('btnSend');
const sendPanel = document.getElementById('sendPanel');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const btnSendTx = document.getElementById('btnSendTx');
const txResult = document.getElementById('txResult');
const networkSelect = document.getElementById('networkSelect');

const importModal = document.getElementById('importModal');
const importSeed = document.getElementById('importSeed');
const btnImportConfirm = document.getElementById('btnImportConfirm');
const btnImportCancel = document.getElementById('btnImportCancel');

// Добавим кнопку выхода (в настройках)
let btnLogout = document.getElementById('btnLogout');
if(!btnLogout) {
  btnLogout = document.createElement('button');
  btnLogout.id = 'btnLogout';
  btnLogout.textContent = 'Выйти из кошелька';
  btnLogout.className = 'btn secondary';
  walletPanel.appendChild(btnLogout);
}

let wallet = null;
let reveal = true;

// -------------------------------------
// Инициализация: скрываем все панели
importModal.hidden = true;
importModal.style.display = 'none';
walletPanel.hidden = true;
sendPanel.hidden = true;

// -------------------------------------
// Вспомогательные функции
function setMnemonicVisible(flag){
  reveal = flag;
  if(!wallet) return;
  mnemonicEl.textContent = reveal ? wallet.mnemonic?.phrase || '—' : '•••••••• •••••••• ••••••••';
  btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
}

function getProvider(){
  const chain = networkSelect.value;
  if(chain === 'ETH'){ return ethers.getDefaultProvider(); }
  else if(chain === 'BSC'){ return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/'); }
}

async function fetchBalance(){
  if(!wallet) return;
  balanceEl.textContent = 'Загрузка...';
  try{
    const provider = getProvider();
    const bal = await provider.getBalance(wallet.address);
    balanceEl.textContent = `${ethers.utils.formatEther(bal)} ${networkSelect.value}`;
  }catch(e){
    console.error(e);
    balanceEl.textContent = 'Ошибка получения баланса';
  }
}

// -------------------------------------
// Сохранение кошелька локально
async function saveWallet(password='MiniWallet123') {
  if(!wallet) return;
  try{
    const json = await wallet.encrypt(password);
    localStorage.setItem('MiniWallet', json);
  }catch(e){ console.error('Ошибка сохранения кошелька', e); }
}

// -------------------------------------
// Показ панели кошелька
function showWallet() {
  walletPanel.hidden = false;
  addressEl.textContent = wallet.address;
  mnemonicEl.textContent = wallet.mnemonic?.phrase || '—';
  setMnemonicVisible(true);
  fetchBalance();
  // Блокируем кнопки
  btnNew.disabled = true;
  btnImport.disabled = true;
  // Сохраняем кошелек автоматически
  saveWallet();
}

// -------------------------------------
// Создание кошелька
function createWallet(){
  if(wallet) { alert('Кошелёк уже существует!'); return; }
  wallet = ethers.Wallet.createRandom();
  showWallet();
}

// -------------------------------------
// Импорт кошелька
btnImport.addEventListener('click', ()=> {
  importModal.hidden = false;
  importModal.style.display = 'flex';
  importSeed.value = '';
});

btnImportCancel.addEventListener('click', ()=> {
  importModal.hidden = true;
  importModal.style.display = 'none';
});

btnImportConfirm.addEventListener('click', ()=> {
  try{
    const phrase = importSeed.value.trim();
    if(!phrase) return alert('Введите seed-фразу!');
    wallet = ethers.Wallet.fromMnemonic(phrase);
    importModal.hidden = true;
    importModal.style.display = 'none';
    showWallet();
  }catch(e){ alert('Некорректная seed-фраза'); }
});

// -------------------------------------
// Выход из кошелька
btnLogout.addEventListener('click', ()=> {
  if(!wallet) return;
  const confirmed = confirm('Вы записали или помните seed-фразу?');
  if(!confirmed) return;
  wallet = null;
  walletPanel.hidden = true;
  sendPanel.hidden = true;
  addressEl.textContent = '';
  mnemonicEl.textContent = '';
  balanceEl.textContent = '—';
  btnNew.disabled = false;
  btnImport.disabled = false;
});

// -------------------------------------
// Показ приватного ключа
btnShowPK.addEventListener('click', ()=> {
  if(!wallet) return alert('Создайте или импортируйте кошелёк');
  alert(`PRIVATE KEY:\n\n${wallet.privateKey}`);
});

// -------------------------------------
// Сохранение локально через пароль
btnSaveLocal.addEventListener('click', ()=> {
  if(!wallet) return alert('Создайте кошелёк');
  const pw = passwordInput.value;
  if(!pw || pw.length < 8) return alert('Пароль минимум 8 символов');
  saveWallet(pw);
  alert('Сохранено локально');
});

// -------------------------------------
// Панель отправки
btnSend.addEventListener('click', ()=> sendPanel.hidden = !sendPanel.hidden);
btnSendTx.addEventListener('click', async ()=> {
  if(!wallet) return alert('Создайте кошелёк');
  const to = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  if(!to || !amount) return alert('Заполните все поля');
  txResult.textContent = 'Отправка...';
  try{
    const provider = getProvider();
    const w = wallet.connect(provider);
    const tx = await w.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount)
    });
    txResult.textContent = `Отправлено! TxHash: ${tx.hash}`;
    fetchBalance();
  }catch(e){
    console.error(e);
    txResult.textContent = 'Ошибка отправки транзакции';
  }
});

// -------------------------------------
// Баланс при смене сети
networkSelect.addEventListener('change', fetchBalance);

// -------------------------------------
// Кнопка показать/скрыть seed
btnReveal.addEventListener('click', ()=> setMnemonicVisible(!reveal));

// -------------------------------------
// Попытка загрузки локально сохраненного кошелька
const savedWallet = localStorage.getItem('MiniWallet');
if(savedWallet){
  const pw = prompt('Введите пароль для локального кошелька:');
  if(pw){
    ethers.Wallet.fromEncryptedJson(savedWallet, pw)
      .then(w => {
        wallet = w;
        showWallet();
      })
      .catch(e => console.warn('Неверный пароль или ошибка расшифровки'));
  }
}

// -------------------------------------
// Подключение к dApp как MetaMask
window.myWalletProvider = {
  isConnected: !!wallet,
  request: async ({ method, params }) => {
    if(method === 'eth_requestAccounts') {
      if(!wallet) throw new Error('Кошелёк не подключен');
      return [wallet.address];
    }
    if(method === 'eth_sendTransaction') {
      if(!wallet) throw new Error('Кошелёк не подключен');
      const txParams = params[0];
      const provider = getProvider();
      const w = wallet.connect(provider);
      const tx = await w.sendTransaction({
        to: txParams.to,
        value: ethers.utils.parseEther(txParams.value)
      });
      return tx.hash;
    }
    throw new Error('Метод не поддерживается');
  }
};

// -------------------------------------
// Привязка кнопок создания
btnNew.addEventListener('click', createWallet);
})();
